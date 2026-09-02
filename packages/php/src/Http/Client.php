<?php

declare(strict_types=1);

namespace MissionInbox\Http;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Psr7\Request;
use MissionInbox\Exceptions\AuthenticationException;
use MissionInbox\Exceptions\ConflictException;
use MissionInbox\Exceptions\DomainBlacklistedException;
use MissionInbox\Exceptions\MissionInboxException;
use MissionInbox\Exceptions\NetworkException;
use MissionInbox\Exceptions\NotFoundException;
use MissionInbox\Exceptions\PermissionException;
use MissionInbox\Exceptions\RateLimitException;
use MissionInbox\Exceptions\SendException;
use MissionInbox\Exceptions\SendLimitExceededException;
use MissionInbox\Exceptions\ServerException;
use MissionInbox\Exceptions\SubscriptionInactiveException;
use MissionInbox\Exceptions\UnregisteredSenderException;
use MissionInbox\Exceptions\UnverifiedDomainException;
use MissionInbox\Exceptions\ValidationException;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * @internal Transport wrapper — do not use directly. Access resources via
 *           MissionInbox::__construct.
 */
final class Client
{
    private const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
    public const SDK_VERSION = '0.1.0';

    private readonly ClientInterface $http;
    private readonly string $baseUrl;
    private readonly string $apiKey;
    private readonly int $maxRetries;

    /**
     * @param array{
     *     api_key: string,
     *     base_url: string,
     *     timeout?: int,
     *     max_retries?: int,
     *     http_client?: ClientInterface
     * } $config
     */
    public function __construct(array $config)
    {
        $this->apiKey = $config['api_key'];
        $this->baseUrl = rtrim($config['base_url'], '/');
        $this->maxRetries = $config['max_retries'] ?? 2;

        if (isset($config['http_client'])) {
            $this->http = $config['http_client'];
        } else {
            $timeoutMs = $config['timeout'] ?? 30_000;
            $this->http = new GuzzleClient([
                'timeout' => $timeoutMs / 1000,
                'http_errors' => false,
            ]);
        }
    }

    /**
     * @param 'GET'|'POST'|'PATCH'|'PUT'|'DELETE' $method
     * @param array<string, mixed>|null $query
     * @param array<string, mixed>|null $body
     * @return mixed The decoded response body (assoc array for JSON, string for text).
     */
    public function request(string $method, string $path, ?array $query = null, ?array $body = null): mixed
    {
        $url = $this->baseUrl . $path . $this->buildQuery($query);
        $headers = [
            'X-Server-API-Key' => $this->apiKey,
            'User-Agent' => 'missioninbox-php/' . self::SDK_VERSION,
            'Accept' => 'application/json',
        ];
        $bodyJson = null;
        if ($body !== null) {
            $headers['Content-Type'] = 'application/json';
            $bodyJson = json_encode($body, JSON_THROW_ON_ERROR);
        }

        $attempt = 0;
        $lastException = null;

        while ($attempt <= $this->maxRetries) {
            try {
                $request = new Request($method, $url, $headers, $bodyJson);
                $response = $this->http->sendRequest($request);
                $status = $response->getStatusCode();

                if ($status >= 200 && $status < 300) {
                    return $this->parseSuccess($response);
                }

                if (in_array($status, self::RETRYABLE_STATUSES, true) && $attempt < $this->maxRetries) {
                    $this->sleep($this->backoffDelay($attempt, $response->getHeaderLine('Retry-After')));
                    $attempt++;
                    continue;
                }

                throw $this->exceptionFromResponse($status, $response);
            } catch (MissionInboxException $e) {
                throw $e;
            } catch (ConnectException | GuzzleException | \Throwable $e) {
                $lastException = $e;
                if ($attempt < $this->maxRetries) {
                    $this->sleep($this->backoffDelay($attempt, ''));
                    $attempt++;
                    continue;
                }
                throw new NetworkException($e->getMessage(), 0, null, $e);
            }
        }

        throw new NetworkException(
            $lastException?->getMessage() ?? 'Request failed after retries.',
            0,
            null,
            $lastException instanceof \Throwable ? $lastException : null,
        );
    }

    private function parseSuccess(ResponseInterface $response): mixed
    {
        $status = $response->getStatusCode();
        if ($status === 204) {
            return null;
        }
        $body = (string) $response->getBody();
        if ($body === '') {
            return null;
        }
        $contentType = $response->getHeaderLine('content-type');
        if (str_contains($contentType, 'application/json')) {
            return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        }
        return $body;
    }

    private function exceptionFromResponse(int $status, ResponseInterface $response): MissionInboxException
    {
        $body = $this->safeDecode((string) $response->getBody());
        $message = $this->extractMessage($body) ?: 'HTTP ' . $status;
        $lower = strtolower($message);

        return match (true) {
            $status === 401 => new AuthenticationException($message, $status, $body),
            $status === 403 && str_contains($lower, 'is not a registered sending identifier')
                => new UnregisteredSenderException($message, $status, $body),
            $status === 403 && str_contains($lower, 'not verified for sending')
                => new UnverifiedDomainException($message, $status, $body),
            $status === 403 && str_contains($lower, 'subscription is not active')
                => new SubscriptionInactiveException($message, $status, $body),
            $status === 403 && str_contains($lower, 'send limit')
                => new SendLimitExceededException($message, $status, $body),
            $status === 403 && (str_contains($lower, 'disabled for sending') || str_contains($lower, 'listed on'))
                => new DomainBlacklistedException($message, $status, $body),
            $status === 403 => new PermissionException($message, $status, $body),
            $status === 404 => new NotFoundException($message, $status, $body),
            $status === 409 => new ConflictException($message, $status, $body),
            $status === 422 => new SendException($message, $status, $body),
            $status === 429 => new RateLimitException($message, $status, $body),
            $status >= 500 => new ServerException($message, $status, $body),
            $status >= 400 => new ValidationException($message, $status, $body),
            default => new MissionInboxException($message, $status, $body),
        };
    }

    /**
     * @param array<string, mixed>|null $body
     */
    private function extractMessage(?array $body): string
    {
        if ($body === null) return '';
        $m = $body['message'] ?? null;
        if (is_string($m)) return $m;
        if (is_array($m)) return implode('; ', array_filter($m, 'is_string'));
        return '';
    }

    /** @return array<string, mixed>|null */
    private function safeDecode(string $body): ?array
    {
        if ($body === '') return null;
        try {
            $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : null;
        } catch (\JsonException) {
            return null;
        }
    }

    /**
     * @param array<string, mixed>|null $query
     */
    private function buildQuery(?array $query): string
    {
        if ($query === null || $query === []) return '';
        $pairs = [];
        foreach ($query as $key => $value) {
            if ($value === null) continue;
            if (is_array($value)) {
                foreach ($value as $v) {
                    if ($v !== null) $pairs[] = rawurlencode((string) $key) . '=' . rawurlencode((string) $v);
                }
            } elseif (is_bool($value)) {
                $pairs[] = rawurlencode((string) $key) . '=' . ($value ? 'true' : 'false');
            } else {
                $pairs[] = rawurlencode((string) $key) . '=' . rawurlencode((string) $value);
            }
        }
        return $pairs === [] ? '' : '?' . implode('&', $pairs);
    }

    private function backoffDelay(int $attempt, string $retryAfter): int
    {
        if ($retryAfter !== '' && is_numeric($retryAfter)) {
            $seconds = (float) $retryAfter;
            if ($seconds > 0) {
                return (int) min($seconds * 1000, 30_000);
            }
        }
        $base = 250 * (2 ** $attempt);
        $jitter = (int) (mt_rand(0, 1000) / 1000 * $base * 0.25);
        return (int) min($base + $jitter, 8_000);
    }

    private function sleep(int $ms): void
    {
        usleep($ms * 1000);
    }
}

<?php

declare(strict_types=1);

namespace MissionInbox\Tests;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use MissionInbox\MissionInbox;
use Psr\Http\Message\RequestInterface;

final class TestHelpers
{
    /**
     * @param array<Response> $responses
     * @param array<int, RequestInterface> $captured Passed by reference; each intercepted request appended here.
     */
    public static function newClient(array $responses, array &$captured = []): MissionInbox
    {
        $mock = new MockHandler($responses);
        $stack = HandlerStack::create($mock);
        $stack->push(Middleware::history($captured));
        $guzzle = new GuzzleClient(['handler' => $stack, 'http_errors' => false]);

        return new MissionInbox([
            'api_key' => 'test-key',
            'base_url' => 'https://api.example.com',
            'max_retries' => 0,
            'http_client' => $guzzle,
        ]);
    }

    public static function jsonResponse(int $status, mixed $body): Response
    {
        $encoded = is_string($body) ? $body : json_encode($body);
        return new Response($status, ['Content-Type' => 'application/json'], $encoded);
    }

    public static function textResponse(int $status, string $body, string $contentType = 'text/plain'): Response
    {
        return new Response($status, ['Content-Type' => $contentType], $body);
    }

    public static function bodyOf(RequestInterface $req): array
    {
        $decoded = json_decode((string) $req->getBody(), true);
        return is_array($decoded) ? $decoded : [];
    }
}

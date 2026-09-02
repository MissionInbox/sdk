<?php

declare(strict_types=1);

namespace MissionInbox\Tests;

use MissionInbox\Exceptions\AuthenticationException;
use MissionInbox\Exceptions\ConflictException;
use MissionInbox\Exceptions\DomainBlacklistedException;
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
use PHPUnit\Framework\TestCase;

final class ErrorsTest extends TestCase
{
    private function send(int $status, string $message): \Throwable
    {
        $mi = TestHelpers::newClient([
            TestHelpers::jsonResponse($status, ['statusCode' => $status, 'message' => $message]),
        ]);
        try {
            $mi->emails->send(['from' => 'a@b.com', 'to' => 'c@d.com', 'subject' => 's', 'text' => 't']);
            $this->fail('Expected an exception');
        } catch (\Throwable $e) {
            return $e;
        }
    }

    public function test401IsAuthenticationException(): void
    {
        $this->assertInstanceOf(AuthenticationException::class, $this->send(401, 'Invalid credentials'));
    }

    public function test403UnregisteredIsUnregisteredSender(): void
    {
        $this->assertInstanceOf(
            UnregisteredSenderException::class,
            $this->send(403, 'x@y.com is not a registered sending identifier. Register it before sending.'),
        );
    }

    public function test403UnverifiedIsUnverifiedDomain(): void
    {
        $this->assertInstanceOf(
            UnverifiedDomainException::class,
            $this->send(403, 'x@y.com cannot send yet: its domain y.com is not verified for sending (dns_pending).'),
        );
    }

    public function test403SubscriptionIsSubscriptionInactive(): void
    {
        $this->assertInstanceOf(
            SubscriptionInactiveException::class,
            $this->send(403, 'Your subscription is not active. Please contact support.'),
        );
    }

    public function test403SendLimitIsSendLimitExceeded(): void
    {
        $this->assertInstanceOf(
            SendLimitExceededException::class,
            $this->send(403, 'Daily send limit of 20 reached for the Free plan.'),
        );
    }

    public function test403BlacklistedIsDomainBlacklisted(): void
    {
        $this->assertInstanceOf(
            DomainBlacklistedException::class,
            $this->send(403, "This domain is listed on Spamhaus and it's disabled for sending."),
        );
    }

    public function test403GenericIsPermission(): void
    {
        $e = $this->send(403, 'Forbidden.');
        $this->assertInstanceOf(PermissionException::class, $e);
        $this->assertNotInstanceOf(UnregisteredSenderException::class, $e);
    }

    public function test400IsValidation(): void
    {
        $this->assertInstanceOf(ValidationException::class, $this->send(400, 'From address is required'));
    }

    public function test404IsNotFound(): void
    {
        $this->assertInstanceOf(NotFoundException::class, $this->send(404, 'Not found'));
    }

    public function test409IsConflict(): void
    {
        $this->assertInstanceOf(ConflictException::class, $this->send(409, 'already registered'));
    }

    public function test422IsSendException(): void
    {
        $this->assertInstanceOf(SendException::class, $this->send(422, 'Failed to send email: SES rejected the message'));
    }

    public function test429IsRateLimit(): void
    {
        $this->assertInstanceOf(RateLimitException::class, $this->send(429, 'Too many requests'));
    }

    public function test500IsServerException(): void
    {
        $this->assertInstanceOf(ServerException::class, $this->send(500, 'Internal error'));
    }
}

<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/**
 * Base class for every exception thrown by the MissionInbox SDK.
 * Catch this to handle any SDK-originated failure; catch a subclass to
 * react to a specific failure mode.
 */
class MissionInboxException extends \Exception
{
    /**
     * @param string $message
     * @param int $status HTTP status code, or 0 for network errors.
     * @param array<string, mixed>|null $body Parsed response body when available.
     */
    public function __construct(
        string $message,
        public readonly int $status = 0,
        public readonly ?array $body = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $status, $previous);
    }
}

<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 429 — too many requests. */
class RateLimitException extends MissionInboxException {}

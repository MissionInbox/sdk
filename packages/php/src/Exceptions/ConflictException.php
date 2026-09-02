<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 409 — resource already exists (e.g. identifier already registered). */
class ConflictException extends MissionInboxException {}

<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 422 — the MTA rejected the message. */
class SendException extends MissionInboxException {}

<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 5xx after retries have been exhausted. */
class ServerException extends MissionInboxException {}

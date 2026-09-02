<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 403 when the plan's daily or monthly send cap has been reached. */
class SendLimitExceededException extends PermissionException {}

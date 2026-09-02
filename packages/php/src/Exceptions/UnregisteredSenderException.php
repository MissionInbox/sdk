<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 403 when the `from` address hasn't been registered as a sending identifier. */
class UnregisteredSenderException extends PermissionException {}

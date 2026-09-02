<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 403 when the sending identifier's domain has not completed DNS/MTA verification. */
class UnverifiedDomainException extends PermissionException {}

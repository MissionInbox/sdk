<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 403 when the domain has been disabled for sending (e.g. listed on a blacklist). */
class DomainBlacklistedException extends PermissionException {}

<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 403 when the failure doesn't match a more specific 403 subclass. */
class PermissionException extends MissionInboxException {}

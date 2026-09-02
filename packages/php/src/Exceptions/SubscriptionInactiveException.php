<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown on HTTP 403 when the account's subscription is not active. */
class SubscriptionInactiveException extends PermissionException {}

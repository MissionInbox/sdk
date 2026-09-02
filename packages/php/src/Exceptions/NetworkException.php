<?php

declare(strict_types=1);

namespace MissionInbox\Exceptions;

/** Thrown when the request failed at the transport layer (DNS, connection reset, timeout). */
class NetworkException extends MissionInboxException {}

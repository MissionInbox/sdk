<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `emails` resource. Access via `$mi->emails`.
 */
final class Emails
{
    public function __construct(private readonly Client $http) {}

    /**
     * Send a transactional email.
     *
     * @param array{
     *   from: string,
     *   to?: string|array<string>,
     *   cc?: string|array<string>,
     *   bcc?: string|array<string>,
     *   subject?: string,
     *   html?: string,
     *   text?: string,
     *   replyTo?: string,
     *   sender?: string,
     *   tag?: string,
     *   headers?: array<string, string>,
     *   messageId?: string,
     *   attachments?: array<array{filename: string, contentType: string, content: string}>
     * } $params
     * @return array{id: string, message: string, status: string, time: int}
     *
     * @example
     * <code>
     * $mi->emails->send([
     *     'from' => 'notifications@acme.com',
     *     'to' => 'user@example.com',
     *     'subject' => 'Welcome',
     *     'html' => '<p>Hi</p>',
     * ]);
     * </code>
     */
    public function send(array $params): array
    {
        $payload = [
            'from' => $params['from'],
            'reply_to' => $params['replyTo'] ?? $params['from'],
        ];

        foreach (['to', 'cc', 'bcc'] as $field) {
            if (isset($params[$field])) {
                $payload[$field] = is_array($params[$field]) ? $params[$field] : [$params[$field]];
            }
        }

        if (isset($params['subject'])) $payload['subject'] = $params['subject'];
        if (isset($params['html'])) $payload['html_body'] = $params['html'];
        if (isset($params['text'])) $payload['plain_body'] = $params['text'];
        if (isset($params['sender'])) $payload['sender'] = $params['sender'];
        if (isset($params['tag'])) $payload['tag'] = $params['tag'];
        if (isset($params['headers'])) $payload['headers'] = $params['headers'];
        if (isset($params['messageId'])) $payload['message_id'] = $params['messageId'];

        if (!empty($params['attachments'])) {
            $payload['attachments'] = array_map(
                fn(array $a) => [
                    'name' => $a['filename'],
                    'content_type' => $a['contentType'],
                    'data' => $a['content'],
                ],
                $params['attachments'],
            );
        }

        return $this->http->request('POST', '/api/email/send', body: $payload);
    }

    /**
     * Look up the delivery status of a single message by its RFC 822 `Message-ID`
     * header.
     *
     * Important: `$messageId` is **not** the id returned by {@see Emails::send()}
     * (that is the API's internal numeric primary key). To obtain the `Message-ID`
     * header value after sending, call {@see Emails::getDetails()} with
     * `include: ['properties']` and read `$result['message']['properties']['message_id']`.
     * It's also present on each item returned by {@see Emails::search()}.
     */
    public function getStatus(string $messageId): array
    {
        return $this->http->request('POST', '/api/email/status', body: ['messageId' => $messageId]);
    }

    /**
     * Look up delivery status for many messages in one request. Entries in the
     * `statuses` array align by index with `$messageIds`; `null` entries mean the
     * id was not found.
     *
     * Same caveat as {@see Emails::getStatus()}: each entry must be an RFC 822
     * `Message-ID` header value, not the numeric id returned by
     * {@see Emails::send()}.
     *
     * @param array<string> $messageIds
     * @return array{statuses: array<array<string, mixed>|null>}
     */
    public function getBulkStatus(array $messageIds): array
    {
        return $this->http->request('POST', '/api/email/bulk_status', body: ['messageIds' => $messageIds]);
    }

    /**
     * Fetch full details of a message.
     *
     * @param array<'properties'|'activity'|'headers'|'spam_checks'|'content'|'attachments'>|null $include
     */
    public function getDetails(string $messageId, ?array $include = null): array
    {
        $body = ['id' => $messageId];
        if ($include !== null && $include !== []) {
            $body['include'] = implode(',', $include);
        }
        return $this->http->request('POST', '/api/email/details', body: $body);
    }

    /** Retrieve the raw RFC-822 source of a message. */
    public function getRaw(string $messageId): array
    {
        return $this->http->request('POST', '/api/email/raw', body: ['id' => $messageId]);
    }

    /**
     * Search sent/received messages.
     *
     * @param array{
     *   from?: string,
     *   sendingIdentifierId?: string,
     *   to?: string,
     *   messageId?: string,
     *   status?: string,
     *   direction?: 'all'|'incoming'|'outgoing',
     *   keyword?: string,
     *   page?: int,
     *   limit?: int,
     *   order?: 'oldest-first'|'newest-first'
     * } $params
     */
    public function search(array $params = []): array
    {
        $body = [];
        if (isset($params['from'])) $body['from'] = $params['from'];
        if (isset($params['sendingIdentifierId'])) $body['sending_identifier_id'] = $params['sendingIdentifierId'];
        if (isset($params['to'])) $body['to'] = $params['to'];
        if (isset($params['messageId'])) $body['message_id'] = $params['messageId'];
        if (isset($params['status'])) $body['status'] = $params['status'];
        if (isset($params['direction'])) $body['direction'] = $params['direction'];
        if (isset($params['keyword'])) $body['keyword'] = $params['keyword'];
        if (isset($params['page'])) $body['page'] = $params['page'];
        if (isset($params['limit'])) $body['limit'] = $params['limit'];
        if (isset($params['order'])) $body['order'] = $params['order'];

        return $this->http->request('POST', '/api/email/search', body: $body);
    }

    /** Report the account's current send-limit state. */
    public function getSendLimit(): array
    {
        return $this->http->request('GET', '/api/email/send-limit-status');
    }
}

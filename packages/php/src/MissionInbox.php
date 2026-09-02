<?php

declare(strict_types=1);

namespace MissionInbox;

use MissionInbox\Http\Client as HttpClient;
use MissionInbox\Resources\Analytics;
use MissionInbox\Resources\Domains;
use MissionInbox\Resources\Emails;
use MissionInbox\Resources\EmailQueue;
use MissionInbox\Resources\Health;
use MissionInbox\Resources\Projects;
use MissionInbox\Resources\SendingIdentifiers;
use MissionInbox\Resources\Tasks;
use Psr\Http\Client\ClientInterface;

/**
 * The MissionInbox API client.
 *
 * Construct one instance and reuse it across your process — the client is
 * stateless beyond its configuration.
 *
 * @example
 * <code>
 * use MissionInbox\MissionInbox;
 *
 * $mi = new MissionInbox([
 *     'api_key' => getenv('MI_API_KEY'),
 *     'base_url' => getenv('MI_API_URL'),
 * ]);
 *
 * $result = $mi->emails->send([
 *     'from' => 'notifications@acme.com',
 *     'to' => 'user@example.com',
 *     'subject' => 'Welcome',
 *     'html' => '<p>Hi</p>',
 * ]);
 * </code>
 */
final class MissionInbox
{
    /** Send and inspect transactional email. */
    public readonly Emails $emails;
    /** Queued outbound emails: list, retry, cancel. */
    public readonly EmailQueue $emailQueue;
    /** Domain management + verification + nested `redirects` sub-resource. */
    public readonly Domains $domains;
    /** Registered `From:` addresses. */
    public readonly SendingIdentifiers $sendingIdentifiers;
    /** Grouping of domains into projects. */
    public readonly Projects $projects;
    /** Send / activity analytics. */
    public readonly Analytics $analytics;
    /** Background bulk-operation tasks. */
    public readonly Tasks $tasks;
    /** Health / liveness ping. */
    public readonly Health $health;

    /**
     * @param array{
     *   api_key: string,
     *   base_url: string,
     *   timeout?: int,
     *   max_retries?: int,
     *   http_client?: ClientInterface
     * } $config
     *   `api_key` — Your MissionInbox product API key.
     *   `base_url` — Base URL of your MissionInbox environment.
     *   `timeout` — Per-request timeout in milliseconds. Default 30000.
     *   `max_retries` — Retries on 429 / 5xx. Default 2.
     *   `http_client` — PSR-18 client override. Defaults to Guzzle.
     *
     * @throws \InvalidArgumentException when `api_key` or `base_url` is missing.
     */
    public function __construct(array $config)
    {
        if (empty($config['api_key'])) {
            throw new \InvalidArgumentException('MissionInbox: `api_key` is required.');
        }
        if (empty($config['base_url'])) {
            throw new \InvalidArgumentException(
                'MissionInbox: `base_url` is required. Use the URL provided for your environment.',
            );
        }

        $http = new HttpClient($config);

        $this->emails = new Emails($http);
        $this->emailQueue = new EmailQueue($http);
        $this->domains = new Domains($http);
        $this->sendingIdentifiers = new SendingIdentifiers($http);
        $this->projects = new Projects($http);
        $this->analytics = new Analytics($http);
        $this->tasks = new Tasks($http);
        $this->health = new Health($http);
    }
}

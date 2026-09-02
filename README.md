# MissionInbox SDKs

Official SDKs for the [MissionInbox](https://missioninbox.com) API.

| Language | Package | Status |
|---|---|---|
| JavaScript / TypeScript | [`@missioninbox/sdk`](https://www.npmjs.com/package/@missioninbox/sdk) (npm) | Beta |

```ts
import { MissionInbox } from '@missioninbox/sdk';

const mi = new MissionInbox({
  apiKey: process.env.MI_API_KEY,
  baseUrl: process.env.MI_API_URL,   // provided by MissionInbox for your environment
});

await mi.transactional.emails.send({
  from: 'notifications@yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome',
  html: '<p>Hi</p>',
});
```

See the per-package README for install and usage:

- [Node / TypeScript](./packages/node/README.md)

## License

MIT — see [LICENSE](./LICENSE).

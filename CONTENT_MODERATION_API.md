# Moderation API

All endpoints reuse durable sessions and live `platform.admin`; non-admins receive403. Writes reuse `/api/app` CSRF/origin validation and rate limits. No new permissions or roles.

`GET /api/admin/moderation?module=job&status=pending_review&search=example&page=1&language=en`

- module: all/hostel/rental/job/tour/service/article/review; default all.
- status: all or the eight shared states; default pending_review.
- search: trimmed Unicode text, max120; page integer1–100000; page size20.
- language: fa/en/ru/hy, default fa. Unknown query keys are rejected.
- response: `{items,total,page,pageSize}`. Item: `{module,id,title,summary,status,version,contentVersion,images,history,historyTotal}`. Summary is plain text, max10000. Up to8 public listing/cover image URLs are included; private documents are never included. `contentVersion` is the SHA256 of server-read canonical native content; do not derive it from a client preview.

`GET /api/admin/moderation/history?module=job&id=...&beforeTime=...&beforeId=...`

Returns `{items}` up to50 events. Omit both cursor fields for the first page; supply both ISO UTC timestamp and UUID for older events. Ordering is descending time/UUID. History remains protected even for deleted content. Event: `{id,from,to,note,actorId,createdAt}`.

`POST /api/app`

```json
{
  "action":"moderateContent",
  "args":[{
    "targets":[{
      "module":"job",
      "id":"CONTENT_ID_FROM_QUEUE",
      "version":1,
      "contentVersion":"64_HEX_CHARACTERS_FROM_QUEUE"
    }],
    "status":"published",
    "note":"Reviewed and approved",
    "confirmed":true
  }]
}
```

Targets1–30, unique module/ID, ID max500 (legacy IDs retained), version integer>=0. Reasons max2000; nonempty for changes_requested/rejected/suspended/archived. Target state is one of draft/pending_review/changes_requested/approved/published/rejected/suspended/archived. The shared transition matrix is authoritative; every target must allow the same requested state. The server re-reads native rows, permissions and versions in the write transaction. Publication validates current module content; service category must be active. Approval remains unpublished. Operational closed/expired/capacity rules are preserved.

Success is the existing `{success:true,state:...}` envelope. Invalid input/transition or stale snapshot yields the existing localized error response (400); unauthorized403; unexpected database failures remain generic500. Failed batches do not partially apply. Fetch fresh queue content after a conflict; do not overwrite a stale version or fabricate approval confirmations. No external notification is sent.

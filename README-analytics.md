# Analytics — Box Breathing Skill Assessment

**Mixpanel project:** [User Research (3998338)](https://mixpanel.com/project/3998338)
**Prototype:** `skill-assessment` · **Version:** `v1`
**Live URL:** https://khushibagai-create.github.io/habuild-skill-assessment/

## Identity capture

On first load, the user sees a blocking modal asking for **Name** and **10-digit phone**. Phone is used as `distinct_id`. Both are stored in `localStorage` (`user_name`, `user_phone`) and registered as super properties on every event. Returning users skip the modal.

`localhost` and `file://` are tracking-disabled — events only fire on the deployed Pages URL.

## Super properties (attached to every event)

| Property | Source |
|---|---|
| `user_name` | identity capture |
| `user_phone` | identity capture |
| `prototype_name` | `skill-assessment` |
| `prototype_version` | `v1` |
| `device_type` | `mobile` (≤768px) or `desktop` |
| `referrer` | `document.referrer` or `direct` |
| `entry_screen` | `intro` |

## Events fired

| Event | When | Properties |
|---|---|---|
| `Identity Captured` | After first-visit name+phone submit | `name`, `phone` |
| `Screen Viewed` | Every screen transition (MutationObserver on `.screen.active`) | `screen_name`, `screen_path`, `time_on_prev_screen_sec` |
| `CTA Clicked` | Any button with `data-track="cta"` or `data-track="back"` | `cta_label`, `cta_location`, `screen_name` + below enrichment |
| `Session Ended` | `beforeunload` | `session_duration_sec`, `screens_viewed`, `last_screen` |

### Per-CTA enrichment

- **Stop** (hold screen) → adds `held_seconds`
- **Try again** / **Start Now** (result screen) → adds `pattern`, `held_seconds`
- **Done** (complete screen) → adds `pattern`, `session_duration`

### Screen names

`intro` · `how_it_works` · `breathe_in` · `hold` · `analyzing` · `result` · `active_breathing` · `complete`

## Verification

### Live event stream
https://mixpanel.com/project/3998338/view/4267822/app/events

### JQL snippet — pastes into Insights → JQL query

```javascript
function main() {
  return Events({
    from_date: '2026-05-19',
    to_date:   '2026-05-20',
    event_selectors: [
      {event: 'Identity Captured'},
      {event: 'Screen Viewed'},
      {event: 'CTA Clicked'},
      {event: 'Session Ended'}
    ]
  })
  .filter(e => e.properties.prototype_name === 'skill-assessment')
  .map(e => ({
    name: e.properties.user_name,
    phone: e.properties.user_phone,
    event: e.name,
    screen: e.properties.screen_name || e.properties.cta_location,
    label: e.properties.cta_label,
    held_sec: e.properties.held_seconds,
    pattern: e.properties.pattern,
    time: new Date(e.time).toISOString()
  }));
}
```

## Manual test

1. Open https://khushibagai-create.github.io/habuild-skill-assessment/ in a private window.
2. Fill the identity modal — name "Test Khushi", phone any valid 10-digit Indian mobile (e.g. 9876543210).
3. Click through all 8 screens: take challenge → start test → hold → stop → start now → wait for completion → done.
4. Within ~30 seconds, check the live event stream — you should see `Identity Captured`, 8× `Screen Viewed`, ~5× `CTA Clicked`, and `Session Ended` when you close the tab.
5. Every event should carry `user_name = "Test Khushi"` and `user_phone = "9876543210"` as properties.

## How to reset for re-testing

In the browser console:
```js
localStorage.removeItem('user_name');
localStorage.removeItem('user_phone');
mixpanel.reset();
location.reload();
```

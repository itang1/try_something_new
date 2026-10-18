# Data model

## Catalog (read-only, shipped with the app, later served per city from a CDN)

- **Activity** ([`data/activities.json`](../data/activities.json)): something to try, like archery or an art museum. It has a name, subcategory, typical duration, cost, and level (easy, a bit new, or stretch). It isn't tied to a city. It can also list other ways to do it: what you'd need at home, how to host friends, or a maps search for venues open map data can't find, like cooking classes. An activity with a season (snow sports) lists its months, flipped for the southern hemisphere, and one that needs warm weather (kayaking) follows its city's warm months. One that needs cold winters (fall colors) only shows up in cities with warm months. Explore leaves out what's out of season.
- **City** ([`data/cities/<id>.json`](../data/cities)): a name, a center point, its warm months (all year if missing), its places, and its icons. One file per city, so a city can be added or updated on its own.
- **Place:** a real location in a city, with coordinates and the activities you can do there. A place can serve several activities (a beach for surfing and for beach yoga). It can override the activity's duration or cost when it differs, like a full day at Universal Studios.
- **City icon:** a hand-picked must-do in one city, like the Getty or Sunset at Griffith Observatory. It points to one place and one activity, and doing it also counts toward that activity. It shares the activity's level unless it sets its own.

A city's list is every activity that has a place there or another way to do it, plus that city's icons. Places will come from the Overture Maps pipeline. Activities and icons stay hand-picked and small.

Icons for activities and city icons come from [`icon-mapping.json`](icon-mapping.json), keyed by the same ids.

## User state (on the device, synced later)

- **Completions:** an append-only log in SQLite of (activity or icon id, done or undone, time). The current state is the latest event per id, which makes syncing and undo simple.
- **Place visits:** a second log of the same shape, (place, activity, visited or not, time). Visiting any place checks off its activity, and checking off a city icon logs a visit to its place. Undoing never cascades.
- **Saved and "Not for me":** lists of ids. Explore skips "Not for me" and done items. "Not for me" items can be brought back from the Filters sheet.
- **Explore filters:** kind, where (go out or stay in), level, drive time, cost, and time, saved across launches. Until three things are done, Explore leaves out stretches unless you pick a level yourself.
- **Location:** home, saved across launches, plus the last five places searched or picked.
- **Trip:** a city and a starting place while traveling. Ending the trip returns to the home location. Without a trip, the city is the one nearest home.
- **Reflections:** saved from the Done moment: the entry, the place you went, a rating (loved it, fine, not for me), a note, and a photo. Photos are copied into the app's documents folder, so deleting one from the camera roll doesn't break it.
- **Plans:** a log of (city, entry, place, day), where a row with no day clears the plan. Days are local dates, not times, so a plan stays on the same day if you travel. Activity ids repeat across cities, so each plan belongs to one city. Adding it to the calendar uses the system's own event form, which needs no calendar permission.
- **Drive times:** a cache in SQLite of (origin, place, minutes, time), where the origin is rounded to about a kilometer so small moves reuse it. Rows older than 30 days are fetched again.
- **Your own activities:** things you add to a city's list, with a name, kind, time, and cost. They have no places yet. Removing one marks it deleted instead of erasing the row, so a later sync can pass that on.

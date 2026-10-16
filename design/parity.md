# Port parity checklist

Everything the SwiftUI app does today, which the Expo app must match before the Swift code is removed from `main`. Screenshots of the SwiftUI app are on the [`native-ios`](../../../tree/native-ios) branch.

## App shell

- Two tabs: **Explore** and **Checklist**, with an orange tint.
- Light and dark mode.
- The catalog loads from `activities.json` on launch. A city's list shows its own activities plus the "Anywhere" ones.

## Shared header (both tabs)

- **City picker menu:** Los Angeles (sun icon) or Columbus (leaf icon). The choice persists across launches and is shared by both tabs.
- **Location button:** shows the current location name, or "Set Location". Tapping it opens the location sheet.

## Location sheet

- Title "Your Location" with a Done button. Opens at half height and can expand to full height.
- **Use My Current Location:** asks for permission, gets the position, and shows the city name ("Pasadena, CA"). Shows "Locating…" while it works.
- **Address field:** "Enter a city or address". Submitting looks up the address, sets the location, and closes the sheet. A spinner shows during the lookup.
- **Autocomplete suggestions** while typing (up to 6, with title and subtitle).
- **Recent addresses:** the last 5 places, newest first, without duplicates. Shown when the field is empty, and tapping one sets it as the location. They persist across launches.

## Explore tab

- Large title "Try Something New".
- **Empty state:** a question-mark icon, "What should you do today?", and "Tap the button to find out!"
- **Try something!** button: picks a random activity for the city, with a spring animation and a haptic tap. Disabled when the city has no activities.
- **Activity card:**
  - Large circle with the subcategory's gradient and the activity icon.
  - Name (wraps rather than truncates).
  - Subcategory pill in the subcategory color.
  - "Try it at: …" with the venue names for this city (wraps).
  - Tags for duration, cost, and drive time (drive time only when a location is set).
  - **Mark as Done** / **Done!** toggle.
- "Drive times from {place}" above the button when a location is set.
- Changing the city clears the current pick.

## Checklist tab

- Large title "Checklist" and a search bar: "Search activities & places", case-insensitive, matching names.
- **Progress card:** trophy, "X of Y completed", percentage, a progress bar, and "Drive times from {place}" or "Set your location for drive times".
- **Status filter:** segmented All / Not Done / Done.
- **Subcategory chips:** "All" plus each subcategory in the city, each with an icon and color. Tapping a selected chip clears it. Changing the city resets the chip.
- **Sort menu:** Name, Distance, Duration, Cost.
- **Rows:** gradient icon tile, name (struck through when done), cost, duration, drive time, venue names on one line, and a check circle. Tapping a row toggles done with an animation.
- **Empty state:** "No matches. Try adjusting your filters."

## Drive times

- Straight-line distance to the nearest venue in the selected city, at 50 km/h, minimum 1 minute.

## Fixes to make during the port (Swift bugs)

- **Sort by Distance does nothing:** it sorts on a stored `driveMinutes` that is always 0. Sort on the computed drive time instead.
- **Row metadata wraps badly** ("1-2 hour s", "4,06 8 min"): keep each tag on one line.
- **The location isn't saved:** it resets on every launch. Persist it.
- Use the larger, higher-contrast secondary text from the `native-ios` branch.

## Known gaps in the first Expo version

- **Autocomplete suggestions:** Apple's free search completer only exists on iOS. The first version looks addresses up on submit with the phone's built-in geocoder. Autocomplete waits until a provider is chosen (Google Places is paid; free options limit autocomplete).

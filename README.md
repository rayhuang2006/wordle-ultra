# Wordle Ultra

An unlimited Wordle-style game designed **for phones first**. Play as many five-letter puzzles as you like, without an account, server, ads, or daily restrictions.

## Features

- Unlimited rounds with a shuffled, curated answer pool. Answers do not repeat until the pool has been exhausted.
- Familiar six-guess gameplay, including correct handling of repeated letters.
- 14,855 valid guesses available offline; easier common words are selected as answers.
- Touch-friendly onscreen keyboard, physical keyboard support, and responsive layouts for phones and tablets.
- Installable PWA with home-screen icons, service-worker caching, and offline play after the first complete online visit.
- Current puzzle, theme, win streak, win percentage, and guess distribution saved locally in the browser.
- Dark and light themes, shareable emoji results, and an optional skip that does not affect statistics.
- No third-party scripts, trackers, backend, dependencies, or build step.

## Play online / install

1. In this repository, open **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then save (after merging the feature PR).
2. Visit **https://rayhuang2006.github.io/wordle-ultra/** once while online.
3. On iPhone, open the website with Safari and use **Share → Add to Home Screen**. On Android, open it with Chrome and use **Install app / Add to Home screen**.
4. After the page and dictionary are cached, open it from the home screen and play offline.

GitHub Pages must be enabled for the link to work. A local file opened via file:// cannot register a service worker.

## Development

No npm install required. Serve this directory over localhost (not file://):

    python3 -m http.server 8000

Visit http://localhost:8000/. Run the logic tests using Node.js:

    node --test tests/logic.test.mjs

## Privacy and data

Everything runs in your browser. The current puzzle, shuffled answer queue, theme, and statistics are stored in localStorage. Clearing site data or using another browser/device resets them. Skipped rounds are not counted in statistics.

## Dictionary attribution

The 14,855-word accepted-guess dictionary in words.txt is sourced from [tabatkins/wordle-list](https://github.com/tabatkins/wordle-list), distributed under the MIT License. Its copyright and license are preserved in THIRD_PARTY_LICENSES/wordle-list-LICENSE.

The smaller answer pool is independently curated to favor familiar English words.

Wordle is associated with The New York Times; this is an unofficial fan-made alternative and is not affiliated with or endorsed by them.

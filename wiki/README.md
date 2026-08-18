# Wiki publishing source

GitHub Wikis are separate Git repositories, so GitHub Pages deployment cannot publish this folder into the repository Wiki automatically. These files are the version-controlled source for the MBTA Tracker Wiki.

To publish them, enable the repository Wiki in GitHub, clone its `*.wiki.git` repository, then copy these Markdown files to that checkout and commit them there. Keep `Home.md` as the Wiki landing page.

Every wiki page should preserve the canonical link to [https://mbta.ai-aarti.com/](https://mbta.ai-aarti.com/) and should contain factual, maintained content rather than duplicate marketing copy.

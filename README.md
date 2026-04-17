# Batch HTML Downloader

Downloading a series of numbered HTML pages one by one is tedious. This extension lets you define a URL pattern with an incrementing number, set a start and end range, and download the whole batch in one go while a live progress bar shows you how far along it is.

## Who this is for

It is useful for developers archiving documentation, researchers saving a series of reports, or anyone who needs to grab a sequence of HTML files from a site that uses numbered URLs.

## How it works

You enter the URL with the number part replaced by a placeholder, set the range you want, and hit Download. The extension steps through each number, fetches the corresponding HTML file, and saves it to your downloads folder using Chrome's native download manager. You can watch the progress in real time as each file comes in.

## How to install

Clone or download this repo, open Chrome and go to chrome://extensions, enable Developer Mode, click Load unpacked, and select this folder.

## Permissions it uses

It only needs the downloads permission to save files to your machine. That is it.

## Built with

Manifest V3 and plain JavaScript with HTML.

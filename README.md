# Batch HTML Downloader

Downloading a series of numbered HTML pages one by one is tedious. This extension lets you define a URL pattern with a number in it, and it will increment through the numbers automatically and download every file in the batch. A live progress table shows you the status of each file as it comes in.

## How it works

You paste in a URL that ends with a number followed by .html, for example something like https://example.com/docs/page-001.html. The extension detects the number, starts from there, and downloads files in batches of 100 at a time. It keeps going until it hits 500 consecutive failures, which tells it there are no more files to find.

For each file it downloads you can see a row appear in the progress table with the filename and whether it succeeded or failed. The status counter at the top updates in real time showing how many have downloaded successfully and how long the current failure streak is.

## Controls

You can pause the download at any point and resume it when you are ready. There is also a stop button if you want to end the session early. Both buttons disable automatically when the download finishes or stops on its own.

You can optionally enter a subfolder name and the extension will organize all downloaded files into that subfolder inside your downloads directory, which makes it much easier to manage large batches.

## How to install

Clone or download this repo, open Chrome and go to chrome://extensions, enable Developer Mode, click Load unpacked, and select this folder.

## Permissions

The extension only needs the downloads permission to save files to your machine. That is all it asks for.

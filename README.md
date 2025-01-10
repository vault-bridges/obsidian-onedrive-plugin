# Obsidian OneDrive Plugin

Welcome to the **Obsidian OneDrive Plugin**!
This plugin is designed to make Obsidian better by adding OneDrive integration.
It solves the problem of needing a place to store and manage files outside your vault that are not in Markdown.

## Motivation

Obsidian is a powerful tool for managing text files, especially because of its linking feature,
making them more organized.
While Obsidian also supports other file formats, such as images and PDFs,
storing all these files within your vault can significantly increase its size.
This growth can present challenges for mobile syncing and local storage capacity.

The Obsidian OneDrive plugin solves this problem by letting users store large files separately from the vault.
This makes the vault smaller, which makes syncing on mobile easier.
It also gives you on-demand access to these files on your mobile devices,
while keeping the files intact and easy to use.

## Features

- **Drag-and-Drop Upload**: Upload files to OneDrive by drag-and-dropping them into the Obsidian editor.

- **Upload Command**: Upload files through the command palette.

- **Dynamic File Widgets**: After uploading, files are displayed as widgets with a title derived from the filename.
  Users can change the title by editing the widget's code block.

- **Interactive File Menu**: The file icon within the widget is clickable and brings up a menu with several options:
	- Open the file online in OneDrive
	- Open the file locally in the default application
	- Download the file to a chosen directory
	- Display a modal with detailed file information, including filename, size, type, OneDrive path, and creation/update
	  dates

## Installation

> [!NOTE]
> This plugin is currently in its **alpha** state, and I welcome feedback to enhance its functionality and stability.

Before installing,
ensure you have the [BRAT Obsidian plugin](https://tfthacker.com/BRAT) installed and running.

Then follow [the BRAT instructions](https://tfthacker.com/brat-quick-guide#Adding+a+beta+plugin).
When prompted, use `vault-bridges/obsidian-onedrive-plugin` as the plugin name to add it to your Obsidian setup.

## Usage

### Setting Up OneDrive Access

To begin using the Obsidian OneDrive Integration plugin, you need to set up access with your OneDrive account.
Ensure you have an active account and authorize the plugin from within Obsidian.
It will specifically access the `My files > Apps > Graph` directory while ensuring the privacy of your other files.

### Configuring Storage Preferences

Once authorization is complete, configure your storage preferences.
Select a directory name for storing files; by default, it is `My files > Apps > Graph > Obsidian`.
You can also set how the plugin handles upload conflicts, choosing between failing, replacing, or renaming the files.

### Adjusting Display Options

Customize how files are displayed within Obsidian by adjusting display settings.
You can enable or disable file previews in the file widgets.
This is disabled by default for performance reasons but can be enabled for visual previews.

### Using the Plugin

With everything set up, you can use the plugin by dragging and dropping files into the Obsidian editor.
The plugin uploads these files to the selected OneDrive folder
and displays them as widgets with an actionable file icon.
In this alpha version, only PDF files are supported, and copy-paste functionality is not yet available.

---

I look forward to your feedback as I continue to refine the Obsidian OneDrive plugin.
Thank you for helping me enhance the versatility and functionality of Obsidian!

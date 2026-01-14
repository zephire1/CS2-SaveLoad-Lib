# CS2 SaveLoad Library

> 📦 A ready-made library for saving and loading user data in CS2 workshop maps, built on the backup system.

## 📑 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
  - [Constructor](#constructor)
  - [Methods](#methods)
  - [Callbacks](#callbacks)
- [Usage Examples](#-usage-examples)
  - [Async/Await Example](#asyncawait-example)
  - [Callback Example](#callback-example)
- [Advanced Configuration](#-advanced-configuration)

## ✨ Features

- 💾 Save and load custom data in CS2 workshop maps
- 🔄 Support for both async/await and callback patterns
- 🚀 Easy to integrate
- 📝 Built on CS2's backup system

## 📥 Installation

### Step 1: Create Hostage Entity

Create a `hostage_entity` with targetname `hostage` in your map (anywhere):

<img src="https://i.imgur.com/iJe79hC.png" alt="Hostage entity setup" />

### Step 2: Import the Library

Place the library code in your script file, after the `cs_script/point_script` import:

```js
import { Instance } from "cs_script/point_script"

// Paste saveload.js code here
```

### Step 3: Initialize

Create a SaveLoadManager instance:

```js
const saveLoadManager = new SaveLoadManager('your_unique_key')
```

### Step 4: Add Round Start Handler

In your `OnRoundStart` handler, add:

```js
Instance.OnRoundStart(() => {
    saveLoadManager.onStartRound()
})
```

## 🚀 Quick Start

```js
import { Instance } from "cs_script/point_script"

// Initialize SaveLoadManager
const saveLoadManager = new SaveLoadManager('mymap')

// Setup round start handler
Instance.OnRoundStart(() => {
    saveLoadManager.onStartRound()
})

// Save data
await saveLoadManager.save("Hello World")

// Load data
const data = await saveLoadManager.load()
Instance.Msg(`Loaded: ${data}`)
```

## 📚 API Reference

### Constructor

```js
new SaveLoadManager(key, config)
```

**Parameters:**

- `key` (string, required): Unique identifier for your save files
- `config` (object, optional): Custom configuration for game settings

**Default configuration:**
```js
{
    mp_maxrounds: 30,
    mp_ignore_round_win_conditions: 0,
    mp_round_restart_delay: 7,
    mp_free_armor: 0
}
```

**Example:**
```js
// With default settings
const manager = new SaveLoadManager('mysave')

// With custom settings
const manager = new SaveLoadManager('mysave', {
    mp_maxrounds: 50,
    mp_round_restart_delay: 5
})
```

### Methods

#### `save(data)`

Saves data to the backup system.

**Parameters:**
- `data` (string): Data to save (will be converted to string)

**Returns:** Promise that resolves when save is complete

**Example:**
```js
await saveLoadManager.save("my data")
```

#### `load()`

Loads previously saved data.

**Returns:** Promise that resolves with the loaded data (string)

**Example:**
```js
const data = await saveLoadManager.load()
```

#### `onStartRound()`

Required method to call in your `OnRoundStart` handler. Manages the save/load process.

**Example:**
```js
Instance.OnRoundStart(() => {
    saveLoadManager.onStartRound()
})
```

### Callbacks

If you prefer not to use async/await, you can use callbacks.

#### `onLoadFinished(callback)`

Sets a callback function to be called when data is loaded.

**Parameters:**
- `callback` (function): Function to call with loaded data

**Example:**
```js
saveLoadManager.onLoadFinished((value) => {
    Instance.Msg(`Loaded: ${value}`)
})
```

#### `onSaveFinished(callback)`

Sets a callback function to be called when data is saved.

**Parameters:**
- `callback` (function): Function to call when save is complete

**Example:**
```js
saveLoadManager.onSaveFinished(() => {
    Instance.Msg('Save complete!')
})
```

## 📝 Usage Examples

These examples demonstrate how to use the library with chat commands (`!save` and `!load`).

### Async/Await Example

```js
import { Instance } from "cs_script/point_script"

// Import or paste saveload.js code here

const saveLoadManager = new SaveLoadManager('mymapname')

Instance.OnRoundStart(() => {
    saveLoadManager.onStartRound()
})

Instance.OnPlayerChat(async ({ text }) => {
    const [command, ...args] = text.split(' ')

    if (command === '!save') {
        await saveLoadManager.save(args.join(' '))
        Instance.Msg('✅ Save complete!')
    }

    if (command === '!load') {
        const data = await saveLoadManager.load()
        Instance.Msg(`📦 Loaded: ${data}`)
    }
})
```

### Callback Example

```js
import { Instance } from "cs_script/point_script"

// Import or paste saveload.js code here

const saveLoadManager = new SaveLoadManager('mymapname')

Instance.OnRoundStart(() => {
    saveLoadManager.onStartRound()
})

Instance.OnPlayerChat(({ text }) => {
    const [command, ...args] = text.split(' ')

    if (command === '!save') {
        saveLoadManager.save(args.join(' '))
    }

    if (command === '!load') {
        saveLoadManager.load()
    }
})

saveLoadManager.onLoadFinished((value) => {
    Instance.Msg('=========================')
    Instance.Msg(`📦 Loaded: ${value}`)
    Instance.Msg('=========================')
})

saveLoadManager.onSaveFinished(() => {
    Instance.Msg('=========================')
    Instance.Msg('✅ Save complete!')
    Instance.Msg('=========================')
})
```

## ⚙️ Advanced Configuration

The second parameter of the constructor allows you to override default game settings. This is necessary because the save/load system temporarily modifies these settings and then restores them to the values you specify.

**Why is this needed?** The library uses the backup system which requires changing certain game settings. By providing custom values, you ensure the settings are restored to your desired values after operations complete.

**Example:**

```js
const saveLoadManager = new SaveLoadManager('mymap', {
    mp_maxrounds: 50,
    mp_round_restart_delay: 5, 
    mp_ignore_round_win_conditions: 1,
    mp_free_armor: 2
})
```

## 🔍 How It Works

The library uses CS2's built-in backup system to store data:
1. Data is encoded into player scores and armor values
2. The backup system saves these values to files
3. On load, the backup is restored and values are decoded back to the original data

## ⚠️ Important Notes

- Always call `saveLoadManager.onStartRound()` in your `OnRoundStart` handler
- The hostage entity is required for the system to work
- Large amounts of data may take multiple rounds to save/load


---

Made with ❤️ for the CS2 mapping community
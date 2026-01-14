class SaveLoadManager {
    constructor(key, config) {
        this.key = key

        if (config) {
            Object.assign(this.DEFAULT_COMMANDS, config)
        }

        this.#runCommand('mp_backup_round_auto 1')
    }

    DEBUG_MODE = true
    START_MARKER = '[start]'
    END_MARKER = '[end]'
    DEFAULT_FILE_NAME = '%prefix%_round%round%.txt'
    DEFAULT_COMMANDS = {
        mp_maxrounds: 30,
        mp_ignore_round_win_conditions: 0,
        mp_round_restart_delay: 7,
        mp_free_armor: 0
    }

    /**
     * Save filename prefix
     */
    key = 'none'

    playerScoreBeforeOperation = 0
    playerArmorBeforeOperation = 0

    onLoadFinishedCallback = () => { }
    onSaveFinishedCallback = () => { }

    saveQueue = []
    saveIndex = 0
    loadedChunks = []
    loadIndex = 0
    isLoading = false
    needsStartFileRestore = false

    onLoadFinished(callback) {
        this.onLoadFinishedCallback = callback
    }

    onSaveFinished(callback) {
        this.onSaveFinishedCallback = callback
    }

    onStartRound() {
        this.#runCommand(`mp_backup_round_file_pattern ${this.DEFAULT_FILE_NAME}`)

        if (this.needsStartFileRestore) {
            this.#restoreStartFile()
            return
        }

        if (this.saveQueue.length > 0) {
            this.#processSaveQueue()
            return
        }

        if (this.isLoading) {
            this.#processLoadChunk()
            return
        }
    }

    save(value) {
        return new Promise((resolve) => {
            const previousCallback = this.onSaveFinishedCallback

            this.onSaveFinishedCallback = () => {
                previousCallback()
                resolve()
            }

            this.#storeAndResetAll()
            this.#createStartFile()
            this.#initiateSaveString(String(value))
        })
    }

    load() {
        return new Promise((resolve) => {
            const previousCallback = this.onLoadFinishedCallback

            this.onLoadFinishedCallback = (value) => {
                previousCallback(value)
                resolve(value)
            }

            this.loadedChunks = []
            this.loadIndex = 0
            this.isLoading = true

            this.#storeAndResetAll()
            this.#createStartFile()

            this.#debug('Starting data load...')
            this.#loadNextChunk()
        })
    }

    #initiateSaveString(value) {
        this.#setupSaveLoadCommands()

        this.saveQueue = this.encodeString(`${this.START_MARKER}${value}${this.END_MARKER}`)
        this.saveIndex = 0

        const totalChunks = Array.isArray(this.saveQueue) ? this.saveQueue.length : 1
        const roundsNeeded = Math.ceil(totalChunks / 2)

        this.#debug(`Saving: ${totalChunks} chunks in ${roundsNeeded} rounds`)

        this.#rescueHostage()
    }

    #processSaveQueue() {
        const chunk1 = this.saveQueue.shift() || 0
        const chunk2 = this.saveQueue.shift() || 0
        const suffix = this.saveIndex

        this.#resetPlayerScore()
        this.#resetPlayerArmor()

        this.getRootPlayer().AddScore(chunk1 + ((this.getRootPlayer().GetPlayerPawn().GetTeamNumber() == 3) ? -1 : 0)) // -1 because rescuing a hostage gives 1 point
        this.getRootPlayer().GetPlayerPawn().SetArmor(chunk2)

        this.#debug(`Saving chunk #${suffix}: score=${chunk1}, armor=${chunk2}`)

        this.#triggerSave(suffix)
        this.saveIndex++

        if (this.saveQueue.length === 0) {
            this.onSaveFinishedCallback()
            this.needsStartFileRestore = true
        }
    }

    #loadNextChunk() {
        const fileName = `${this.saveFileName}_${this.loadIndex}.txt`

        this.#debug(`Loading: ${fileName}`)
        this.#runCommand(`mp_backup_restore_load_file ${fileName}`)
    }

    #processLoadChunk() {
        const scoreValue = this.getRootPlayer().GetScore()
        const armorValue = this.getRootPlayer().GetPlayerPawn().GetArmor()

        this.#debug(`Loaded round #${this.loadIndex}: score=${scoreValue}, armor=${armorValue}`)

        if (scoreValue !== 0) {
            this.loadedChunks.push(scoreValue)
        }

        if (armorValue !== 0) {
            this.loadedChunks.push(armorValue)
        }

        this.#resetPlayerScore()
        this.#resetPlayerArmor()

        this.getRootPlayer().AddScore(this.playerScoreBeforeOperation)
        this.getRootPlayer().GetPlayerPawn().SetArmor(this.playerArmorBeforeOperation)

        if (this.#isLoadComplete()) {
            this.#finishLoad()
        } else {
            this.loadIndex++
            this.#loadNextChunk()
        }
    }

    #isLoadComplete() {
        const decodedString = this.decodeString(this.loadedChunks)

        this.#debug(`Decoded: ${decodedString}`)

        return decodedString.includes(this.END_MARKER)
    }

    #finishLoad() {
        const decodedString = this.decodeString(this.loadedChunks)
        const extractedData = this.#extractData(decodedString)

        this.#debug(`Loaded: ${extractedData}`)

        this.#resetLoadState()
        this.onLoadFinishedCallback(extractedData)

        this.needsStartFileRestore = true

        this.#rescueHostage()
    }

    #extractData(str) {
        const startIndex = str.indexOf(this.START_MARKER)
        const endIndex = str.indexOf(this.END_MARKER)

        if (startIndex === -1 || endIndex === -1) {
            return ''
        }

        return str.substring(startIndex + this.START_MARKER.length, endIndex)
    }

    #resetLoadState() {
        this.isLoading = false
        this.loadIndex = 0
        this.loadedChunks = []
    }

    #storeAndResetAll() {
        this.playerScoreBeforeOperation = Math.abs(this.getRootPlayer().GetScore())
        this.playerArmorBeforeOperation = this.getRootPlayer().GetPlayerPawn().GetArmor()

        this.#resetPlayerScore()
        this.#resetPlayerArmor()
    }

    #resetPlayerScore() {
        const score = Math.abs(this.getRootPlayer().GetScore())

        this.getRootPlayer().AddScore(-score)
    }

    #resetPlayerArmor() {
        this.getRootPlayer().GetPlayerPawn().SetArmor(0)
    }

    #createStartFile() {
        this.#debug('Creating start file')
        this.#runCommand('mp_free_armor 0')

        const fileName = `${this.saveFileName}_start.txt`

        this.#runCommand(`mp_backup_round_file_pattern ${fileName}`)
        this.#runCommand(`mp_round_restart_delay 0`)
        this.#rescueHostage()
    }

    #restoreStartFile() {
        this.#debug('Restoring start file')
        this.needsStartFileRestore = false
        const fileName = `${this.saveFileName}_start.txt`
        this.#runCommand(`mp_backup_restore_load_file ${fileName}`)

        this.#rollbackSaveLoadCommands()
    }

    #rescueHostage() {
        Instance.EntFireAtName({
            name: 'hostage',
            input: 'OnRescueZoneTouch',
            delay: 0.1
        })
    }

    #triggerSave(suffix) {
        const fileName = `${this.saveFileName}_${suffix}.txt`

        this.#runCommand(`mp_backup_round_file_pattern ${fileName}`)

        this.#rescueHostage()
    }

    getRootPlayer() {
        return Instance.GetPlayerController(0)
    }

    #runCommand(command) {
        this.#debug(`Executing command: ${command}`)

        Instance.ServerCommand(command)
    }

    #debug(msg) {
        if (!this.DEBUG_MODE) {
            return
        }

        Instance.Msg(`[SaveLoadManager] ${msg}`)
    }

    #setupSaveLoadCommands() {
        this.#runCommand('mp_maxrounds 99999')
        this.#runCommand('mp_ignore_round_win_conditions 0')
        this.#runCommand(`mp_round_restart_delay 0`)
        this.#runCommand(`mp_free_armor 0`)
    }

    #rollbackSaveLoadCommands() {
        this.#runCommand(`mp_maxrounds ${this.DEFAULT_COMMANDS.mp_maxrounds}`)
        this.#runCommand(`mp_ignore_round_win_conditions ${this.DEFAULT_COMMANDS.mp_ignore_round_win_conditions}`)
        this.#runCommand(`mp_round_restart_delay ${this.DEFAULT_COMMANDS.mp_round_restart_delay}`)
        this.#runCommand(`mp_free_armor ${this.DEFAULT_COMMANDS.mp_free_armor}`)
    }

    encodeString(str) {
        const bytes = this.stringToUtf8Bytes(str)
        const ints = []

        let value = 0
        let count = 0

        for (let b of bytes) {
            if (count === 3) {
                const packed = value * 4 + (count - 1)
                ints.push(packed)
                value = 0
                count = 0
            }
            value = value * 256 + b
            count++
        }

        if (count > 0) {
            const packed = value * 4 + (count - 1)
            ints.push(packed)
        }

        return ints.length === 1 ? ints[0] : ints
    }

    decodeString(data) {
        const ints = Array.isArray(data) ? data : [data]
        const bytes = []

        for (let packed of ints) {
            const count = (packed % 4) + 1
            let value = Math.floor(packed / 4)

            const block = new Array(count)

            for (let i = count - 1; i >= 0; i--) {
                block[i] = value % 256
                value = Math.floor(value / 256)
            }

            bytes.push(...block)
        }

        return this.utf8BytesToString(bytes)
    }

    stringToUtf8Bytes(str) {
        const bytes = []

        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i)

            if (code >= 0xD800 && code <= 0xDBFF) {
                const next = str.charCodeAt(++i)
                code = ((code - 0xD800) << 10) + (next - 0xDC00) + 0x10000
            }

            if (code <= 0x7F) {
                bytes.push(code)
            } else if (code <= 0x7FF) {
                bytes.push(
                    0xC0 | (code >> 6),
                    0x80 | (code & 0x3F)
                )
            } else if (code <= 0xFFFF) {
                bytes.push(
                    0xE0 | (code >> 12),
                    0x80 | ((code >> 6) & 0x3F),
                    0x80 | (code & 0x3F)
                )
            } else {
                bytes.push(
                    0xF0 | (code >> 18),
                    0x80 | ((code >> 12) & 0x3F),
                    0x80 | ((code >> 6) & 0x3F),
                    0x80 | (code & 0x3F)
                )
            }
        }

        return bytes
    }

    utf8BytesToString(bytes) {
        let str = ""

        for (let i = 0; i < bytes.length;) {
            const b = bytes[i]

            if (b < 0x80) {
                str += String.fromCharCode(b)
                i++
            } else if ((b & 0xE0) === 0xC0) {
                const code = ((b & 0x1F) << 6) | (bytes[i + 1] & 0x3F)
                str += String.fromCharCode(code)
                i += 2
            } else if ((b & 0xF0) === 0xE0) {
                const code =
                    ((b & 0x0F) << 12) |
                    ((bytes[i + 1] & 0x3F) << 6) |
                    (bytes[i + 2] & 0x3F);
                str += String.fromCharCode(code)
                i += 3
            } else {
                const code =
                    ((b & 0x07) << 18) |
                    ((bytes[i + 1] & 0x3F) << 12) |
                    ((bytes[i + 2] & 0x3F) << 6) |
                    (bytes[i + 3] & 0x3F)
                const u = code - 0x10000
                str += String.fromCharCode(
                    0xD800 + (u >> 10),
                    0xDC00 + (u & 0x3FF)
                )
                i += 4
            }
        }

        return str
    }

    get saveFileName() {
        return this.key
    }
}


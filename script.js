const challenges = []
let appState = {}

function $(selector) {
    return document.querySelector(selector)
}

const u = {
    match: function(a,b) {
        a = JSON.stringify(a)
        b = JSON.stringify(b)
        console.log(`Compare ${a} vs ${b}`)
        return a == b
    },

    matchInts: function(a, b) {
        a = a.map(x => parseInt(x, 10))
        return u.match(a, b)
    },

    intRnd: function(minValue, maxValue) {
        const x = Math.random() * (maxValue - minValue)
        return minValue + (x|0)
    },

    pluralise: function(count, singular, plural = null) {
        if (!plural) plural = singular + "s"
        return count === 1 ? `${count} ${singular}` : `${count} ${plural}`
    },
}

class Challenge {
    static add(maxLines, maxChars, title, description, env, validator) {
        const qno = challenges.length + 1
        const instance = new Challenge(qno, title, description, maxLines, maxChars, env, validator)
        challenges.push(instance)
        return instance
    }
    
    constructor(qno, title, description, maxLines, maxChars, env, validator) {
        this.qno = qno
        this.title = title
        this.description = description
        this.maxLines = maxLines
        this.maxChars = maxChars
        this.env = env
        this.validator = validator
        this.code = ""
        this.achievement = 0
    }

    loadState() {
        const info = appState[this.title] ?? { code: "", achievement: 0 }
        this.code = info.code;
        this.achievement = info.achievement
    }

    saveState() {
        appState[this.title] = { code: this.code, achievement: this.achievement }
    }

    display() {
        editor.setValue(this.code)
        $('#challengeTitle').textContent = `Challenge ${this.qno}: ${this.title}`;
        $('#challengeDesc').innerHTML = this.description;
        $('#maxChars').textContent = u.pluralise(this.maxChars, "char")
        $('#maxLines').textContent = u.pluralise(this.maxLines, "line")
        document.querySelectorAll('#medals .medal').forEach((el, i) => {
            el.classList.toggle('earned', i < this.achievement);
        });
    }

    setAchievement(achievement) {
        const hasChanged = this.achievement !== achievement
        this.achievement = achievement
        return hasChanged
    }

    createEnv() {
        let env = this.env ?? {}
        if (typeof env == "function") env = env.call(this)
        return JSON.stringify(env)
    }

    validate(code, text, env) {
        this.code = code
        const codeLines = code.split("\n")
        env = JSON.parse(env)
        
        text = text.toString().split(/\n/)
        text = text.map(line => line.trim().toLowerCase())
        while (text.length > 0 && text[text.length - 1] == "") text.pop()
        const isMatch = this.validator.call(this, text, env)
        const linesOK = codeLines.length <= this.maxLines
        const charsOK = code.length <= this.maxChars

        this.saveState()
        saveAppState()
        this.issueFeedback(isMatch, linesOK, charsOK)
        this.display()
    }

    issueFeedback(isMatch, linesOK, charsOK) {
        if (!isMatch) {
            if (this.setAchievement(0)) {
                showFeedback("No medal earned", "Sorry, your output is not correct.")
            }
        } else if (!linesOK && !charsOK) {
            if (this.setAchievement(1)) {
                showFeedback("Bronze medal earned", "To earn a silver medal, make your code shorter or reduce the number of lines.")
            }
        } else if (linesOK && !charsOK) {
            if (this.setAchievement(2)) {
                showFeedback("Silver medal earned", "To get the gold medal, make your code shorter.")
            }
        } else if (!linesOK && charsOK) {
            if (this.setAchievement(2)) {
                showFeedback("Silver medal earned", "To get the gold medal, fit your code on fewer lines.")
            }
        } else {
            if (this.setAchievement(3)) {
                showFeedback("Gold medal earned", "You have completed this challenge. Well done!")
            }
        }
    }
}

/*********************************************************************
 * Localstorage                                                     **
 *********************************************************************/

function loadAppState() {
    const json = localStorage.getItem(`pygolf-state`)
    try {
        if (json) appState = JSON.parse(json)
    } catch (e) {}
}

function saveAppState() {
    localStorage.setItem(`pygolf-state`, JSON.stringify(appState))
}
        
/*********************************************************************
 * Feedback dialog                                                  **
 *********************************************************************/

function showFeedback(title, message) {
    $('#feedback-dialog-title').textContent = title;
    $('#feedback-dialog-message').textContent = message;
    $('#feedback-dialog').style.display = 'flex';
}
 
/*********************************************************************
 * Challenge buttons                                                **
 *********************************************************************/

function setChallengeIndex(challengeIndex) {
    if (challengeIndex >= 0 && challengeIndex < challenges.length) {
        appState.currentChallengeIndex = challengeIndex
        window.challenge = challenges[challengeIndex]
        window.challenge.loadState()
        window.challenge.display()
    }
}

$('#btn-prev').addEventListener('click', () => {
    setChallengeIndex(appState.currentChallengeIndex - 1)
});

$('#btn-next').addEventListener('click', () => {
    setChallengeIndex(appState.currentChallengeIndex + 1)
});

/*********************************************************************
 * Editor toolbar                                                   **
 *********************************************************************/

$('#btn-clear').addEventListener('click', () => {
    editor.setValue('');
});

$('#btn-run').addEventListener('click', () => {
    localStorage.setItem("saved-code", editor.getValue());
});

$('#btn-save').addEventListener('click', () => {
    const blob = new Blob([editor.getValue()], { type: 'text/x-python' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'script.py';
    link.click();
    URL.revokeObjectURL(link.href);
});

$('#btn-load').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        editor.setValue(ev.target.result);
    };
    reader.readAsText(file);
    fileInput.value = '';
});

const updateStats = () => {
    const doc = editor.getDoc();
    const numChars = doc.getValue().length
    const numLines = doc.lineCount()
    $('#curChars').textContent = u.pluralise(numChars, "char")
    $('#curLines').textContent = u.pluralise(numLines, "line")

    const challenge = window.challenge
    if (challenge) {
        $('#curChars').classList.toggle('satisfied', numChars <= challenge.maxChars)
        $('#curLines').classList.toggle('satisfied', numLines <= challenge.maxLines)
    }
};

/*********************************************************************
 * Initialisation                                                   **
 *********************************************************************/
    
document.addEventListener('DOMContentLoaded', () => {
    window.editor = CodeMirror($('#editor'), {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        autofocus: true
    });

    editor.on('change', updateStats);
    updateStats();

    $("#feedback-dialog-ok").addEventListener("click", function() {
        $("#feedback-dialog").style.display = "none"
    })

    loadAppState()
    setChallengeIndex(appState.currentChallengeIndex ?? 0)
});

Challenge.add(1, 22,
    `Hello World`,
    `Print the text: Hello World!`,
    {},
    function(i) {
        return u.match(i, [ 'hello world!' ])
    }
)

Challenge.add(1, 29,
    `Count to Five`,
    `Print numbers 1 through 5, each on its own line.`,
    {},
    function(i) {
        return u.matchInts(i, [ 1, 2, 3, 4, 5 ])
    }
)

Challenge.add(1, 31,
    `Even Numbers`,
    `Print even numbers from 2 to 10, each on a new line.`,
    {},
    function(i) {
        return u.matchInts(i, [2, 4, 6, 8, 10])
    }
)

Challenge.add(1, 16,
    `Sum a List`,
    `
        The variable <code>data</code> contains a list of numbers.
        Add them all up and print the total.
    `,
    function() {
        const data = []
        while (data.length < 20) data.push(u.intRnd(0, 30))
        return { data }
    },
    function(i, env) {
        let total = 0
        for (const x of env.data) total += x
        return u.matchInts(i, [total])
    },
)

Challenge.add(1, 40,
    `Sorting by length`,
    `
    The variable <code>names</code> contains an array of names.
    Print them in order from shortest to longest, with one name on each line.
    `,
    {"names" : [ "Jane", "Andrew", "Frederick", "Phillip", "Hanna", "Victoria" ]},
    function(i) {
        return u.match(i, [ "jane", "hanna", "andrew", "phillip",  "victoria", "frederick" ]);
    },
)

Challenge.add(2, 80,
    `Fibonacci`,
    `
    Starting from 1, 1, print the first 20 numbers in the Fibonacci sequence.
    Make sure each number is on a separate line.
    `,
    {},
    function(i) {
        return u.matchInts(i, [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765]);
    }
)

Challenge.add(4, 100,
    `Prime Factors`,
    `Print all prime numbers below 100, in ascending order, one per line.`,
    {},
    function(i) {
        return u.matchInts(i, [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]);
    }
)

/*
Challenge.add(4, 100,
    `String Compression`,
    `Compress "AAABBC" into run-length format "A3B2C1" and print it.`,
    {},
    function(i) {
        return u.match(i, ["A3B2C1"]);
    }
)

// 17. Set Operations
Challenge.add(3, 70,
    `Set Intersection & Union`,
    `Given a={1,2,3,4,5}, b={4,5,6,7,8}, print sorted intersection then sorted union, space-separated on two lines.`,
    function(i) {
        return u.match(i, ["4 5","1 2 3 4 5 6 7 8"]);
    }
)

// 18. CSV Data Parsing
Challenge.add(4, 105,
    `CSV Sorter`,
    `Parse "Name,Age\nAlice,20\nBob,22\nCharlie,19". Print names sorted by age ascending.`,
    function(i) {
        return u.match(i, ["Charlie","Alice","Bob"]);
    }
)

// 19. Generator Yield
Challenge.add(4, 85,
    `Power Generator`,
    `Use a generator to yield powers of 2 (1 to 512). Print each value.`,
    function(i) {
        return u.match(i, ["1","2","4","8","16","32","64","128","256","512"]);
    }
)

// 20. Hexadecimal Mapping
Challenge.add(2, 50,
    `Hex Mapping`,
    `Print lowercase hexadecimal representations of integers 10 through 15.`,
    function(i) {
        return u.match(i, ["a","b","c","d","e","f"]);
    }
)
*/

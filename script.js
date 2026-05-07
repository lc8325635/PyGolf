const challenges = []
let myStorage = {}
let currentChallengeIndex = 0

class Challenge {
    static add(maxLines, maxChars, title, description, f) {
        const id = challenges.length + 1
        const instance = new Challenge(id, title, description, maxLines, maxChars, f)
        challenges.push(instance)
        return instance
    }
    
    constructor(id, title, description, maxLines, maxChars, f) {
        this.id = id
        this.title = title
        this.description = description
        this.maxLines = maxLines
        this.maxChars = maxChars
        this.f = f
        this.code = ""
        this.achievement = 0
    }

    load() {
        let data =             {
            code: "",
            achievement: 0
        }
        const json = localStorage.getItem(`challenge-${this.id}`)
        try {
            if (json) data = JSON.parse(json)
        } catch (e) {}
        this.code = data.code;
        this.achievement = data.achievement
    }

    save() {
        localStorage.setItem(`challenge-${this.id}`, JSON.stringify({
            code: this.code,
            achievement: this.achievement
        }))
    }

    display() {
        editor.setValue(this.code)
        document.getElementById('challengeTitle').textContent = `Challenge ${this.id}: ${this.title}`;
        document.getElementById('challengeDesc').innerHTML = this.description;
        document.getElementById('maxLines').textContent = this.maxLines;
        document.getElementById('maxChars').textContent = this.maxChars;
        document.querySelectorAll('#medals .medal').forEach((el, i) => {
            el.classList.toggle('earned', i < this.achievement);
        });
    }

    setAchievement(achievement) {
        achievement = Math.max(this.achievement, achievement)
        this.achievement = achievement
    }

    validate(code, text) {
        this.code = code
        text = text.toString().split(/\n/)
        text = text.map(line => line.trim())
        while (text.length > 0 && text[text.length - 1] == "") text.pop()
        const matched = this.f.call(this, text)
        const lines = code.split("\n")

        if (matched) {
            const linesOK = lines.length <= this.maxLines
            const charsOK = code.length <= this.maxChars
            this.setAchievement(1)
            if (linesOK || charsOK) this.setAchievement(2)
            if (linesOK && charsOK) this.setAchievement(3)
        }

        this.save()
        this.display()
    }

    match(a, b) {
        return JSON.stringify(a) == JSON.stringify(b)
    }
}

/*********************************************************************
 * Challenge buttons                                                **
 *********************************************************************/

function navigateChallenge(delta) {
    const newIndex = currentChallengeIndex + delta;
    if (newIndex >= 0 && newIndex < challenges.length) {
        currentChallengeIndex = newIndex
        window.challenge = challenges[currentChallengeIndex]
        window.challenge.load()
        window.challenge.display()
    }
}

document.getElementById('btn-prev').addEventListener('click', () => {
    navigateChallenge(-1)
});

document.getElementById('btn-next').addEventListener('click', () => {
    navigateChallenge(1)
});

/*********************************************************************
 * Editor toolbar                                                   **
 *********************************************************************/

document.getElementById('btn-clear').addEventListener('click', () => {
    editor.setValue('');
});

document.getElementById('btn-run').addEventListener('click', () => {
    localStorage.setItem("saved-code", editor.getValue());
});

document.getElementById('btn-save').addEventListener('click', () => {
    const blob = new Blob([editor.getValue()], { type: 'text/x-python' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'script.py';
    link.click();
    URL.revokeObjectURL(link.href);
});

document.getElementById('btn-load').addEventListener('click', () => fileInput.click());
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
    statsEl.textContent = `Lines: ${doc.lineCount()} | Characters: ${doc.getValue().length}`;
};

/*********************************************************************
 * Initialisation                                                   **
 *********************************************************************/
    
document.addEventListener('DOMContentLoaded', () => {
    window.editor = CodeMirror(document.getElementById('editor'), {
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

    navigateChallenge(0)
});

Challenge.add(1, 22,
    `Hello World!`,
    `Print the text: Hello World!`,
    function(i) {
        return this.match(i, [ 'hello world!' ])
    }
)

Challenge.add(1, 29,
    `Count to Five`,
    `Print numbers 1 through 5, each on its own line.`,
    function(i) {
        const values = i.map(x => parseInt(x, 10))
        return this.match(values, [ 1, 2, 3, 4, 5 ])
    }
)

Challenge.add(1, 31,
    `Even Numbers`,
    `Print even numbers from 2 to 10, each on a new line.`,
    function(i) {
        const values = i.map(x => parseInt(x, 10))
        return this.match(values, [2, 4, 6, 8, 10])
    }
)

Challenge.add(1, 9,
    `Sum a List`,
    `Print the sum of [1, 2, 3, 4, 5].`,
    function(i) {
        i = i.map(x => parseInt(x, 10))
        return this.match(i, [15])
    }
)

Challenge.add(1, 41,
    `Sorting by length`,
    `
    The variable <code>names</code> contains an array of names.
    Print them in order from shortest to longest.
    `,
    function(i) {
        return this.match(i, [ "Jane", "Hanna", "Andrew", "Phillip",  "Victoria", "Frederick" ]);
    }
)

Challenge.add(2, 80,
    `Fibonacci`,
    `
    Starting from 1, 1, print the first 20 numbers in the Fibonacci sequence.
    Make sure each number is on a separate line.
    `,
    function(i) {
        i = i.map(x => parseInt(x, 10))
        const s = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765]
        return this.match(i, s);
    }
)
/*
Challenge.add(5, 110,
    `Prime Factors`,
    `Find and print all prime factors of 60 in ascending order, one per line.`,
    function(i) {
        return this.match(i, ["2","2","3","5"]);
    }
)

// 16. Run-Length Encoding
Challenge.add(4, 100,
    `String Compression`,
    `Compress "AAABBC" into run-length format "A3B2C1" and print it.`,
    function(i) {
        return this.match(i, ["A3B2C1"]);
    }
)

// 17. Set Operations
Challenge.add(3, 70,
    `Set Intersection & Union`,
    `Given a={1,2,3,4,5}, b={4,5,6,7,8}, print sorted intersection then sorted union, space-separated on two lines.`,
    function(i) {
        return this.match(i, ["4 5","1 2 3 4 5 6 7 8"]);
    }
)

// 18. CSV Data Parsing
Challenge.add(4, 105,
    `CSV Sorter`,
    `Parse "Name,Age\nAlice,20\nBob,22\nCharlie,19". Print names sorted by age ascending.`,
    function(i) {
        return this.match(i, ["Charlie","Alice","Bob"]);
    }
)

// 19. Generator Yield
Challenge.add(4, 85,
    `Power Generator`,
    `Use a generator to yield powers of 2 (1 to 512). Print each value.`,
    function(i) {
        return this.match(i, ["1","2","4","8","16","32","64","128","256","512"]);
    }
)

// 20. Hexadecimal Mapping
Challenge.add(2, 50,
    `Hex Mapping`,
    `Print lowercase hexadecimal representations of integers 10 through 15.`,
    function(i) {
        return this.match(i, ["a","b","c","d","e","f"]);
    }
)
*/

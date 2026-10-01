"use strict";
(() => {
  // src/content.ts
  var pick = (a) => a[Math.floor(Math.random() * a.length)];
  var n = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  var BLOCKLIST = ["203.0.113.66", "192.0.2.99"];
  var PEOPLE = ["a student at home", "a parent", "a phone on school Wi-Fi", "a visitor from Texas", "a library computer", "a laptop at a cafe"];
  var goodIp = () => {
    let ip = "";
    do {
      ip = pick(["198.51.100.", "203.0.113.", "192.0.2."]) + n(2, 250);
    } while (BLOCKLIST.includes(ip));
    return ip;
  };
  var PORT_NAMES = {
    80: "HTTP (website)",
    443: "HTTPS (secure website)",
    22: "SSH (remote login)",
    23: "Telnet (old, unsafe login)",
    21: "FTP (file transfer)",
    445: "SMB (file sharing)",
    3389: "RDP (remote desktop)",
    3306: "MySQL (database)"
  };
  var BAD_PORT_WHY = {
    22: "Port 22 is remote login. Strangers try to guess passwords on it all day.",
    23: "Port 23 is Telnet. It sends passwords as plain text. Keep it shut.",
    21: "Port 21 is file transfer. A website does not need it.",
    445: "Port 445 is file sharing. The WannaCry worm spread through it in 2017.",
    3389: "Port 3389 is remote desktop. Ransomware gangs love finding it open.",
    3306: "Port 3306 is a database. Databases should never face the Internet."
  };
  var SIGNATURES = [
    ["OR 1=1", "tricks a database (SQL injection)"],
    ["<script>", "sneaks code into a web page"],
    ["../", "tries to climb into other folders"]
  ];
  var CLEAN_MSG = ["Show me the school calendar", "Search: library hours", "Login: maya.r (password ok)", "Upload: science_project.pdf", "Search: script for the school play", "Search: 1 or 2 day field trip", "Comment: Great game last night!"];
  var BAD_MSG = [
    ["Search: ' OR 1=1 --", "OR 1=1"],
    ["Login: admin' OR 1=1 --", "OR 1=1"],
    ["Comment: <script>steal()<\/script>", "<script>"],
    ["Get file: ../../secret/grades.txt", "../"]
  ];
  var TRICKY = {
    "Search: script for the school play": 'It says "script", but not "<script>". A signature has to match exactly. This one is normal.',
    "Search: 1 or 2 day field trip": '"1 or 2" is not "OR 1=1". Just a normal search.'
  };
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  var pid = 0;
  var id = (p) => `${p}-${++pid}`;
  function gatePackets() {
    const good = () => {
      const port = pick([443, 443, 80]);
      return {
        id: id("gate"),
        cat: "website-ok",
        from: goodIp(),
        who: pick(PEOPLE),
        port,
        allow: true,
        why: port === 443 ? "Port 443 is a secure website. It is on the allow list." : "Port 80 is a website. It is on the allow list."
      };
    };
    const badPort = () => {
      const port = pick([22, 23, 21, 445, 3389, 3306]);
      return {
        id: id("gate"),
        cat: "bad-port",
        from: goodIp(),
        who: pick(PEOPLE.concat(["unknown sender"])),
        port,
        allow: false,
        why: BAD_PORT_WHY[port] + " Only 80 and 443 are allowed."
      };
    };
    const badIp = () => {
      const ip = pick(BLOCKLIST);
      return {
        id: id("gate"),
        cat: "blocklist",
        from: ip,
        who: "unknown sender",
        port: pick([443, 80]),
        allow: false,
        why: `The port is fine, but ${ip} is on the blocklist. The blocklist rule is checked first.`
      };
    };
    const list = shuffle([good(), good(), good(), good(), good(), badPort(), badPort(), badPort(), badIp(), badIp()]);
    list[n(3, 8)].golden = true;
    return list;
  }
  function guardPackets() {
    const clean = () => {
      const m = pick(CLEAN_MSG);
      return {
        id: id("guard"),
        cat: TRICKY[m] ? "tricky-clean" : "clean",
        from: goodIp(),
        who: pick(PEOPLE),
        port: pick([443, 443, 80]),
        msg: m,
        allow: true,
        why: TRICKY[m] || "Good IP, allowed port, clean message. Let it in."
      };
    };
    const attack = () => {
      const [m, sig] = pick(BAD_MSG);
      const s = SIGNATURES.find((x) => x[0] === sig);
      return {
        id: id("guard"),
        cat: "signature",
        from: goodIp(),
        who: pick(PEOPLE),
        port: pick([443, 80]),
        msg: m,
        allow: false,
        why: `The port is allowed, but the message has "${s[0]}". That ${s[1]}. Block it.`
      };
    };
    const badPort = () => {
      const port = pick([22, 3389, 445]);
      return {
        id: id("guard"),
        cat: "bad-port",
        from: goodIp(),
        who: "unknown sender",
        port,
        msg: pick(CLEAN_MSG),
        allow: false,
        why: BAD_PORT_WHY[port] + " The message looks fine, but the door is closed."
      };
    };
    const badIp = () => {
      const ip = pick(BLOCKLIST);
      return {
        id: id("guard"),
        cat: "blocklist",
        from: ip,
        who: "unknown sender",
        port: 443,
        msg: pick(CLEAN_MSG),
        allow: false,
        why: `${ip} is on the blocklist. It does not matter how nice the message looks.`
      };
    };
    const list = shuffle([clean(), clean(), clean(), clean(), clean(), attack(), attack(), attack(), badPort(), badPort(), badIp(), badIp()]);
    list[n(4, 11)].golden = true;
    return list;
  }
  var CHAPTERS = [
    {
      id: "c1",
      num: 1,
      place: "Town Hall",
      topic: "What is cybersecurity?",
      minutes: 5,
      icon: "hall",
      color: "#F5A623",
      badge: "First Steps",
      lessons: [
        {
          title: "Welcome to Byteville",
          art: "town",
          body: [
            "Byteville runs on computers. The school keeps grades on them. The bank keeps money records. The hospital keeps patient files. Even the traffic lights are online.",
            "<b>Cybersecurity</b> means protecting computers, phones, networks, and the information on them from people who want to <b>steal</b> it, <b>change</b> it, or <b>break</b> it.",
            "Your job: help Byteville stay safe. I will teach you one idea at a time. Then you will practice it."
          ]
        },
        {
          title: "The CIA Triad",
          art: "cia",
          body: [
            "No, not the spy agency. In security, CIA stands for three things we protect.",
            '<span class="term c">Confidentiality</span> Only the right people can see it. Like a lock on your diary.',
            `<span class="term i">Integrity</span> Nobody secretly changes it. Like a teacher's grade book that only the teacher can edit.`,
            '<span class="term a">Availability</span> It works when you need it. Like the school website on the first day of class.'
          ],
          fact: "Almost every attack breaks at least one of these three. Spotting which one helps you choose the right defense."
        },
        {
          title: "Who attacks, and why?",
          art: "attackers",
          body: [
            "Most attackers want <b>money</b>. Ransomware locks a school's files and demands payment to unlock them.",
            "Some want <b>secrets</b>, like passwords or test answers. Some just want to <b>show off</b>.",
            "The good news: simple habits and good tools stop most attacks. That is what you will learn here."
          ]
        }
      ],
      check: {
        id: "c1-check",
        prompt: "Someone changes your grade from a C to an A without permission. Which part of CIA is broken?",
        options: ["Confidentiality", "Integrity", "Availability"],
        answer: 1,
        explain: "The grade was changed, so it can no longer be trusted. That is Integrity."
      },
      stages: [{
        type: "sort",
        title: "Sort the Trouble",
        intro: "Read each problem. Which part of CIA does it break? Click the right bin.",
        bins: [{ label: "Confidentiality", hint: "Someone saw what they should not" }, { label: "Integrity", hint: "Something was changed" }, { label: "Availability", hint: "Something stopped working" }],
        cards: [
          { id: "c1-s1", text: "A stranger reads your private messages.", bin: 0, explain: "Private info was seen by the wrong person. Confidentiality." },
          { id: "c1-s2", text: "A hacker changes the price of shoes on a store website to $1.", bin: 1, explain: "The price was changed without permission. Integrity." },
          { id: "c1-s3", text: "The school website crashes on the first day of class.", bin: 2, explain: "Nobody can use it when they need it. Availability." },
          { id: "c1-s4", text: "Your friend watches over your shoulder as you type your PIN.", bin: 0, explain: "Your secret was seen. Confidentiality." },
          { id: "c1-s5", text: "A virus edits files so the numbers in them are wrong.", bin: 1, explain: "The data was changed, so you cannot trust it. Integrity." },
          { id: "c1-s6", text: "A storm knocks out power to the server room.", bin: 2, explain: "Not every problem is a hacker. The system is down. Availability." },
          { id: "c1-s7", text: "Thousands of fake visitors flood a game server, so real players cannot log in.", bin: 2, explain: "This is a DDoS attack. It blocks real users. Availability." },
          { id: "c1-s8", text: "Someone posts your password online.", bin: 0, explain: "A secret is now public. Confidentiality." }
        ]
      }],
      outro: "You can now name the three things every defender protects. Next stop: the Locksmith."
    },
    {
      id: "c2",
      num: 2,
      place: "The Locksmith",
      topic: "Passwords and MFA",
      minutes: 6,
      icon: "lock",
      color: "#17807E",
      badge: "Key Master",
      lessons: [
        {
          title: "Your password is a key",
          art: "password",
          body: [
            "A password is the key to your account. Attackers do not guess by hand. They use computers that try <b>billions</b> of guesses.",
            "Short passwords fall fast. Passwords made from your name, birthday, or pet are easy to guess, because that information is often online."
          ]
        },
        {
          title: "What makes a strong password?",
          art: "password",
          body: [
            '<b>Long beats clever.</b> Four random words, like <span class="mono">purple-tractor-moon-salad</span>, are long, easy to remember, and very hard to guess.',
            "<b>One per site.</b> If one website leaks, the thief tries that password everywhere. Different passwords stop that.",
            "<b>Use a password manager.</b> It remembers them all for you."
          ],
          fact: "Swapping letters for symbols, like P@ssw0rd, does not fool anyone. Attack tools try those swaps first."
        },
        {
          title: "MFA: a second lock",
          art: "mfa",
          body: [
            "<b>Multi-factor authentication</b> (MFA) asks for two different kinds of proof:",
            "<b>Something you know</b> (a password), <b>something you have</b> (your phone), or <b>something you are</b> (your fingerprint).",
            "Even if a thief steals your password, they still do not have your phone. MFA stops most account takeovers."
          ]
        }
      ],
      check: {
        id: "c2-check",
        prompt: "Which one is MFA?",
        options: ["A password and a second password", "A password and a code sent to your phone", "A very long password"],
        answer: 1,
        explain: "Password (something you know) plus phone (something you have) is two different kinds of proof. That is MFA."
      },
      stages: [
        {
          type: "choice",
          style: "pair",
          title: "Password Gym",
          intro: "Two keys. Click the stronger one.",
          items: [
            { id: "c2-p1", prompt: "Which password is stronger?", options: ["dragon123", "blue-river-pizza-cloud"], answer: 1, explain: `Four random words make a long password. "dragon123" is on every hacker's list.` },
            { id: "c2-p2", prompt: "Which password is stronger?", options: ["Jessica2010", "maple-guitar-orbit-sock"], answer: 1, explain: "A name plus a birth year is easy to find on social media." },
            { id: "c2-p3", prompt: "Which password is stronger?", options: ["P@ssw0rd!", "correct-horse-lamp-yellow"], answer: 1, explain: "Symbol swaps are tried first by attack tools. Length wins." },
            { id: "c2-p4", prompt: "Which habit is safer?", options: ["The same strong password on every site", "A different password on every site, saved in a password manager"], answer: 1, explain: "If one site leaks, a reused password unlocks all your other accounts." },
            { id: "c2-p5", prompt: "Which password is stronger?", options: ["qwerty", "Qz8#mL2!vR9p"], answer: 1, explain: '"qwerty" is a keyboard row. The second one is long and random.' }
          ]
        },
        {
          type: "choice",
          style: "list",
          title: "What would you do?",
          intro: "Real situations. Pick the best answer.",
          items: [
            { id: "c2-q1", prompt: "You get a text with a login code you did not ask for. What should you do?", options: ["Ignore the code and change your password", "Send the code to whoever asks for it", "Reply STOP"], answer: 0, explain: "Someone may know your password and is stuck at MFA. Never share the code, and change your password." },
            { id: "c2-q2", prompt: "A friend asks for your game password so they can level up your character. What do you do?", options: ["Share it, they are a friend", "Say no, and keep your password private", "Share it, then change it next month"], answer: 1, explain: "Passwords are never shared, even with friends. Accounts get stolen this way all the time." }
          ]
        }
      ],
      outro: "Strong keys and a second lock. Byteville's doors are safer already."
    },
    {
      id: "c3",
      num: 3,
      place: "Post Office",
      topic: "Spotting phishing",
      minutes: 6,
      icon: "mail",
      color: "#E8604C",
      badge: "Phish Spotter",
      lessons: [
        {
          title: "What is phishing?",
          art: "phish",
          body: [
            "<b>Phishing</b> is a fake message that pretends to be from someone you trust. Its goal is to trick you into clicking a link, typing your password, or sending money.",
            "It can be an email, a text message, a DM, or even a phone call."
          ],
          fact: "In Verizon's 2026 breach report, people were part of about 6 out of every 10 data breaches. Tricking a person is often easier than hacking a computer."
        },
        {
          title: "Red flags to look for",
          art: "flags",
          body: [
            '<b>Hurry!</b> "Your account closes in 1 hour." Pressure stops you from thinking.',
            '<b>Weird sender.</b> <span class="mono">support@netfIix-help.co</span> uses a capital I instead of an l.',
            "<b>Asks for secrets.</b> Real companies never ask for your password or gift card codes.",
            '<b>Too good to be true.</b> "You won 10,000 Robux!" You did not.'
          ]
        },
        {
          title: "What to do",
          art: "report",
          body: [
            "<b>Stop.</b> Do not click links or open attachments.",
            "<b>Check it yourself.</b> Open the real app or type the website address yourself.",
            "<b>Report it.</b> Tell a teacher, a parent, or IT, then delete it."
          ]
        }
      ],
      check: {
        id: "c3-check",
        prompt: "Which is the biggest red flag?",
        options: ['The email says "Hello"', "The email asks you to type your password on a link", "The email has a logo"],
        answer: 1,
        explain: "Real companies never ask for your password through a link. Logos are easy to copy."
      },
      stages: [{
        type: "inbox",
        title: "Inbox Patrol",
        intro: "Open each message. Decide: Safe or Phish?",
        emails: [
          { id: "c3-e1", from: "Netflix", address: "billing@netfIix-support.co", subject: "Account suspended! Update payment in 2 hours", body: "We could not process your payment. Your account will be deleted unless you update your card now.", link: "netfIix-support.co/update", phish: true, clues: ['Capital I instead of l in "netfIix"', 'Strange ending ".co"', 'Pressure: "in 2 hours"'] },
          { id: "c3-e2", from: "Ms. Carter", address: "jcarter@byteville-high.edu", subject: "Reminder: quiz moved to Friday", body: "Hi class, the quiz is moved to Friday. Study chapter 4. See you tomorrow!", phish: false, clues: ["School address you know", "No link, no request for secrets", "Normal, calm message"] },
          { id: "c3-e3", from: "Roblox Rewards", address: "free.robux.rewards@gmail.com", subject: "YOU WON 10,000 ROBUX!!!", body: "Congrats! To claim your Robux, log in below with your username and password.", link: "robux-claim-now.net", phish: true, clues: ["Too good to be true", "A company does not use a free Gmail address", "Asks for your password"] },
          { id: "c3-e4", from: "Principal Grant", address: "principal.office.2026@outlook.com", subject: "Quick favor, keep it secret", body: "I need you to buy 5 gift cards for a staff surprise. Send me the codes today. Do not tell anyone.", phish: true, clues: ["Personal email, not the school address", "Gift cards are a classic scam", '"Keep it secret" is pressure'] },
          { id: "c3-e5", from: "USPS", address: "Text from +1 (838) 555-0147", subject: "Package on hold", body: "USPS: Your package is on hold. Pay a $1.99 fee to deliver.", link: "usps-redelivery-help.info", kind: "text", phish: true, clues: ["USPS does not text you for fees", "The link is not usps.com", "Small fee to steal your card number"] },
          { id: "c3-e6", from: "Library", address: "notices@byteville-library.org", subject: "Your book is due Monday", body: 'The book "Wonder" is due Monday. You can renew it at the front desk or in the library app.', phish: false, clues: ["Asks for nothing secret", "Tells you to use the app or desk you already know", "No pressure"] }
        ]
      }],
      outro: "You just caught the trick behind most attacks. The Post Office is proud of you."
    },
    {
      id: "c4",
      num: 4,
      place: "Hardware Store",
      topic: "Security controls",
      minutes: 6,
      icon: "tools",
      color: "#3C9D5D",
      badge: "Control Expert",
      lessons: [
        {
          title: "What is a security control?",
          art: "controls",
          body: [
            "A <b>security control</b> is anything that protects something. Think about your home.",
            "A <b>lock</b> keeps people out. A <b>doorbell camera</b> shows who came by. <b>Insurance</b> helps you recover after a break-in.",
            "Computers use the same three ideas."
          ]
        },
        {
          title: "Three jobs: Prevent, Detect, Fix",
          art: "controls",
          body: [
            '<span class="term c">Prevent</span> Stop the problem before it happens. Locks, passwords, firewalls.',
            '<span class="term i">Detect</span> Notice when something bad is happening. Cameras, alarms, an IDS.',
            '<span class="term a">Fix</span> Recover after something goes wrong. Backups, antivirus cleanup, restoring files.'
          ],
          fact: "Good defenders use all three. No lock is perfect, so you also need a camera and a backup."
        },
        {
          title: "Three kinds: Physical, Technical, Administrative",
          art: "controlKinds",
          body: [
            "<b>Physical:</b> things you can touch. Fences, guards, a locked server room.",
            "<b>Technical:</b> done by computers. Firewalls, encryption, MFA.",
            '<b>Administrative:</b> rules and training for people. "Never share your password." Lessons like this one.'
          ]
        }
      ],
      check: {
        id: "c4-check",
        prompt: "A security camera is mainly a...",
        options: ["Prevent control", "Detect control", "Fix control"],
        answer: 1,
        explain: "A camera does not stop anyone. It shows you what happened. That is Detect."
      },
      stages: [
        {
          type: "sort",
          title: "Stock the Shelves",
          intro: "Each control has one main job. Put it on the right shelf.",
          bins: [{ label: "Prevent", hint: "Stops it before it happens" }, { label: "Detect", hint: "Notices it happening" }, { label: "Fix", hint: "Recovers afterward" }],
          cards: [
            { id: "c4-s1", text: "A lock on the server room door", bin: 0, explain: "It keeps people out. Prevent." },
            { id: "c4-s2", text: "A firewall that blocks bad traffic", bin: 0, explain: "It stops traffic before it gets in. Prevent." },
            { id: "c4-s3", text: "Multi-factor authentication (MFA)", bin: 0, explain: "It stops a thief from logging in. Prevent." },
            { id: "c4-s4", text: "A security camera in the hallway", bin: 1, explain: "It records what happens. Detect." },
            { id: "c4-s5", text: "An alert when someone logs in at 3 AM from another country", bin: 1, explain: "It notices strange activity. Detect." },
            { id: "c4-s6", text: "An intrusion detection system (IDS)", bin: 1, explain: "The word is right in the name. Detect." },
            { id: "c4-s7", text: "Restoring files from last night's backup", bin: 2, explain: "It recovers what was lost. Fix." },
            { id: "c4-s8", text: "Antivirus removing a virus it found", bin: 2, explain: "It cleans up after the infection. Fix." },
            { id: "c4-s9", text: "Rebuilding a laptop after ransomware", bin: 2, explain: "It brings the computer back to a safe state. Fix." }
          ]
        },
        {
          type: "choice",
          style: "list",
          title: "Physical, Technical, or Administrative?",
          intro: "One more sort, quick-fire style.",
          items: [
            { id: "c4-k1", prompt: "A tall fence around the data center", options: ["Physical", "Technical", "Administrative"], answer: 0, explain: "You can touch it. Physical." },
            { id: "c4-k2", prompt: "Encrypting files so only the owner can read them", options: ["Physical", "Technical", "Administrative"], answer: 1, explain: "The computer does it. Technical." },
            { id: "c4-k3", prompt: 'A school rule: "Never share your password"', options: ["Physical", "Technical", "Administrative"], answer: 2, explain: "A rule for people. Administrative." },
            { id: "c4-k4", prompt: "Training every student to spot phishing", options: ["Physical", "Technical", "Administrative"], answer: 2, explain: "Training is a people control. Administrative." }
          ]
        }
      ],
      outro: "You now think like a security planner: prevent, detect, and fix. Time to guard the City Gate."
    },
    {
      id: "c5",
      num: 5,
      place: "City Gate",
      topic: "Firewalls",
      minutes: 6,
      icon: "gate",
      color: "#3B6FB6",
      badge: "Gatekeeper",
      lessons: [
        {
          title: "Data travels in packets",
          art: "packet",
          body: [
            "When you open a video, it does not arrive in one piece. It is cut into thousands of small <b>packets</b>, like envelopes.",
            "Every envelope has a <b>From</b> address, a <b>To</b> address, and a <b>door number</b>. These addresses are called <b>IP addresses</b>."
          ],
          fact: "A 5 MB photo travels as about 3,500 packets. They are put back together when they arrive."
        },
        {
          title: "Ports are doors",
          art: "ports",
          body: [
            "A computer has 65,536 numbered doors called <b>ports</b>. Each program listens at its own door.",
            "<b>443</b> is secure websites. <b>80</b> is regular websites. <b>22</b> is remote login. <b>3389</b> is remote desktop.",
            "Open doors are risky. A web server only needs 80 and 443."
          ]
        },
        {
          title: "The firewall is the gate guard",
          art: "firewall",
          body: [
            "A <b>firewall</b> checks every packet against a list of rules, then decides: <b>allow</b> or <b>block</b>.",
            "It reads the outside of the envelope: who sent it, where it is going, and which door.",
            "Golden rule: <b>if it is not on the list, it does not get in.</b> This is called <i>default deny</i>."
          ]
        }
      ],
      check: {
        id: "c5-check",
        prompt: 'The firewall rule is "Allow port 443 only." A packet wants port 3389. What happens?',
        options: ["Allowed", "Blocked", "It waits"],
        answer: 1,
        explain: "3389 is not on the list, so default deny blocks it."
      },
      stages: [{
        type: "lane",
        title: "Gate Duty",
        intro: "Packets are coming! Check your rules and decide before each one reaches the gate. Gold packets are worth bonus points.",
        wall: "FIREWALL",
        left: "The Internet",
        right: "Byteville School",
        seconds: 12,
        yes: "ALLOW",
        no: "BLOCK",
        rules: [{ kind: "block", text: "Anything from a blocklisted IP" }, { kind: "allow", text: "Port 80 or 443 (websites)" }, { kind: "block", text: "Every other port" }],
        chips: [{ label: "Blocklist", values: BLOCKLIST }],
        packets: gatePackets
      }],
      outro: "Not one stranger slipped through your gate. Next, you will build the rules yourself."
    },
    {
      id: "c6",
      num: 6,
      place: "Rule Workshop",
      topic: "Firewall rule order",
      minutes: 5,
      icon: "workshop",
      color: "#8A5BB8",
      badge: "Rule Architect",
      lessons: [
        {
          title: "Order matters",
          art: "order",
          body: [
            "A firewall reads its rules from the <b>top down</b>. As soon as one rule matches, it stops reading. This is called <b>first match wins</b>.",
            'So if "Block everything" is at the top, nothing ever gets through, not even the school website.'
          ]
        },
        {
          title: "How to build a good list",
          art: "order",
          body: [
            'Put the most <b>specific</b> rules at the top, like "Block this one bad IP."',
            'Put the general allow rules in the middle, like "Allow websites."',
            'Put <b>"Block everything"</b> at the very bottom as the safety net.'
          ]
        }
      ],
      check: {
        id: "c6-check",
        prompt: 'Where should "Block everything" go?',
        options: ["At the top", "In the middle", "At the bottom"],
        answer: 2,
        explain: "At the bottom, it catches whatever the other rules did not allow."
      },
      stages: [{
        type: "order",
        title: "Fix the Rule List",
        intro: "Use the arrows to put the rules in order. Then press Test. All test packets must turn green.",
        puzzles: [
          {
            id: "c6-o1",
            goal: "Let website visitors in. Keep everything else out.",
            rules: [{ id: "all", text: "Block everything", action: "block" }, { id: "443", text: "Allow port 443 (websites)", action: "allow", port: 443 }],
            tests: [{ label: "Visitor to the website", ip: "198.51.100.7", port: 443, allow: true }, { label: "Stranger trying remote desktop", ip: "198.51.100.7", port: 3389, allow: false }],
            hint: "The safety net goes at the bottom."
          },
          {
            id: "c6-o2",
            goal: "Let website visitors in, except the known bad IP 203.0.113.66.",
            rules: [{ id: "443", text: "Allow port 443 (websites)", action: "allow", port: 443 }, { id: "all", text: "Block everything", action: "block" }, { id: "ip", text: "Block IP 203.0.113.66", action: "block", ip: "203.0.113.66" }],
            tests: [{ label: "Normal visitor to the website", ip: "198.51.100.7", port: 443, allow: true }, { label: "Bad IP to the website", ip: "203.0.113.66", port: 443, allow: false }, { label: "Stranger trying remote login", ip: "198.51.100.7", port: 22, allow: false }],
            hint: 'The most specific rule, about one single IP, must come before "Allow port 443".'
          },
          {
            id: "c6-o3",
            goal: "Only the IT laptop (10.0.5.20) may use remote login on port 22. Websites stay open to all.",
            rules: [{ id: "b22", text: "Block port 22 (remote login)", action: "block", port: 22 }, { id: "443", text: "Allow port 443 (websites)", action: "allow", port: 443 }, { id: "all", text: "Block everything", action: "block" }, { id: "it", text: "Allow port 22 from IT laptop 10.0.5.20", action: "allow", port: 22, ip: "10.0.5.20" }],
            tests: [{ label: "IT laptop, remote login", ip: "10.0.5.20", port: 22, allow: true }, { label: "Stranger, remote login", ip: "203.0.113.9", port: 22, allow: false }, { label: "Visitor to the website", ip: "198.51.100.7", port: 443, allow: true }, { label: "Stranger trying remote desktop", ip: "198.51.100.7", port: 3389, allow: false }],
            hint: 'The IT laptop rule is more specific than "Block port 22", so it must be above it.'
          }
        ]
      }],
      outro: "You just did a real network engineer's job. Rule order trips up professionals too."
    },
    {
      id: "c7",
      num: 7,
      place: "Watchtower",
      topic: "Intrusion detection (IDS)",
      minutes: 5,
      icon: "tower",
      color: "#C9862B",
      badge: "Watchtower Eye",
      lessons: [
        {
          title: "What the gate cannot see",
          art: "ids",
          body: [
            "The firewall only reads the <b>outside</b> of the envelope. It never opens it.",
            "So an attack can sneak in through an allowed door, like port 443, hidden inside the message."
          ]
        },
        {
          title: "The IDS is a security camera",
          art: "ids",
          body: [
            "An <b>Intrusion Detection System</b> (IDS) watches the traffic and reads what is <b>inside</b>.",
            "If it sees something bad, it raises an <b>alert</b> for a human to check. It does not block anything by itself."
          ]
        },
        {
          title: "Two ways to spot trouble",
          art: "signature",
          body: [
            '<b>Signatures</b> are like wanted posters. The IDS looks for known attack text, such as <span class="mono">OR 1=1</span>.',
            "<b>Anomalies</b> are things that look weird compared to normal. A school laptop sending 5 GB of data at 3 AM is weird."
          ],
          fact: 'Signatures must match exactly. "script for the play" is not the same as "&lt;script&gt;".'
        }
      ],
      check: {
        id: "c7-check",
        prompt: "What does an IDS do when it finds an attack?",
        options: ["Blocks it", "Raises an alert", "Deletes the computer"],
        answer: 1,
        explain: "An IDS watches and alerts. Blocking is the job of an IPS, which you will meet next."
      },
      stages: [{
        type: "choice",
        style: "list",
        title: "Tower Watch",
        intro: "These all got past the firewall. Read what is inside. Normal, or raise the alert?",
        items: [
          { id: "c7-w1", prompt: "Message: Search: ' OR 1=1 --", options: ["Normal", "Alert"], answer: 1, explain: 'It contains "OR 1=1", a database trick. Alert.' },
          { id: "c7-w2", prompt: "Message: Show me the school calendar", options: ["Normal", "Alert"], answer: 0, explain: "A normal request. No signature." },
          { id: "c7-w3", prompt: "Message: Comment: <script>steal()<\/script>", options: ["Normal", "Alert"], answer: 1, explain: 'It contains "<script>", code hidden in a comment. Alert.' },
          { id: "c7-w4", prompt: "Message: Search: script for the school play", options: ["Normal", "Alert"], answer: 0, explain: '"script" is not "<script>". Signatures must match exactly. Normal.' },
          { id: "c7-w5", prompt: "Activity: A school laptop sends 5 GB to an unknown server at 3:12 AM", options: ["Normal", "Alert"], answer: 1, explain: "Huge upload, strange time, unknown place. That is an anomaly. Alert." },
          { id: "c7-w6", prompt: "Activity: A student downloads a 20 MB PDF for class at 10 AM", options: ["Normal", "Alert"], answer: 0, explain: "Normal size, normal time, normal reason." },
          { id: "c7-w7", prompt: "Message: Get file: ../../secret/grades.txt", options: ["Normal", "Alert"], answer: 1, explain: '"../" tries to climb into folders it should not reach. Alert.' },
          { id: "c7-w8", prompt: "Activity: The same account fails to log in 50 times in one minute", options: ["Normal", "Alert"], answer: 1, explain: "Someone is guessing passwords. That is an anomaly. Alert." }
        ]
      }],
      outro: "Sharp eyes! The watchtower caught what the gate could not see."
    },
    {
      id: "c8",
      num: 8,
      place: "Guard Post",
      topic: "IPS and defense in depth",
      minutes: 6,
      icon: "shield",
      color: "#2E2A3B",
      badge: "Town Defender",
      lessons: [
        {
          title: "The IPS can stop attacks",
          art: "ips",
          body: [
            "An <b>Intrusion Prevention System</b> (IPS) reads inside packets like an IDS. The difference: it sits <b>in the path</b>, so it can <b>block</b> bad packets right away.",
            "IDS = camera that calls for help. IPS = guard who stops the intruder."
          ]
        },
        {
          title: "Oops: false positives",
          art: "ips",
          body: [
            "Sometimes an IPS blocks something that was actually fine. That is a <b>false positive</b>.",
            "Missing a real attack is a <b>false negative</b>. Defenders tune their rules to keep both low."
          ]
        },
        {
          title: "Defense in depth",
          art: "castle",
          body: [
            "A castle has a moat, a wall, guards, and a locked treasure room. If one layer fails, the next one is still there.",
            "Byteville works the same way: <b>training</b> stops phishing, <b>MFA</b> stops stolen passwords, the <b>firewall</b> guards the doors, the <b>IPS</b> checks the messages, and <b>backups</b> fix what breaks."
          ]
        }
      ],
      check: {
        id: "c8-check",
        prompt: "The IPS blocks a student's real homework upload by mistake. This is a...",
        options: ["False positive", "False negative", "True positive"],
        answer: 0,
        explain: "It raised the alarm on something that was fine. False positive."
      },
      stages: [{
        type: "lane",
        title: "Night Shift",
        intro: "Final challenge! You are the firewall AND the IPS. Check the IP, then the port, then the message. Faster this time.",
        wall: "FIREWALL + IPS",
        left: "The Internet",
        right: "Byteville School",
        seconds: 10,
        yes: "ALLOW",
        no: "BLOCK",
        rules: [{ kind: "block", text: "Anything from a blocklisted IP" }, { kind: "block", text: "Any port that is not 80 or 443" }, { kind: "alert", text: "Any message with a signature" }, { kind: "allow", text: "Everything that passed all three checks" }],
        chips: [{ label: "Blocklist", values: BLOCKLIST }, { label: "Signatures", values: SIGNATURES.map((s) => s[0]) }],
        packets: guardPackets
      }],
      outro: "Byteville is safe tonight because of you. Head to Graduation for your certificate!"
    }
  ];
  var RANKS = [
    [0, "Rookie"],
    [200, "Cadet"],
    [600, "Gate Guard"],
    [1200, "Analyst"],
    [1900, "Defender"],
    [2600, "Chief of Security"]
  ];
  var BADGES = [
    ...CHAPTERS.map((c) => ({ id: "ch-" + c.id, name: c.badge, how: `Finish chapter ${c.num}: ${c.place}` })),
    { id: "streak5", name: "Hot Streak", how: "5 right answers in a row" },
    { id: "streak10", name: "Unstoppable", how: "10 right answers in a row" },
    { id: "golden", name: "Golden Catch", how: "Handle a gold packet correctly" },
    { id: "perfect", name: "Perfectionist", how: "Get 3 stars on 3 chapters" },
    { id: "quick", name: "Quick Thinker", how: "5 fast right answers at the gate" },
    { id: "grad", name: "Graduate", how: "Finish all 8 chapters" },
    { id: "nw-first", name: "Night Owl", how: "Solve your first Night Watch level" },
    { id: "nw-half", name: "Graveyard Shift", how: "Solve 6 Night Watch levels" },
    { id: "nw-clean", name: "No Hints Needed", how: "Solve a Night Watch level from 7 up without hints" },
    { id: "nw-all", name: "Sentinel", how: "Solve all 12 Night Watch levels" }
  ];
  var PRAISE = ["Nice catch!", "Great thinking!", "You got it!", "Sharp eyes!", "Exactly right!", "Well done, defender!"];
  var ENCOURAGE = ["Almost! Here is the trick:", "Good try. Here is what to look for:", "Not this time. Remember:", "Close! Keep this in mind:"];

  // src/art.ts
  var svg = (vb, body, label) => `<svg viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  function ada(size = 64) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="var(--sky)"/>
  <path d="M14 58c2-10 9-15 18-15s16 5 18 15" fill="var(--teal)"/>
  <rect x="29" y="47" width="6" height="7" rx="1" fill="var(--sun)"/>
  <circle cx="32" cy="31" r="13" fill="#C98E62"/>
  <path d="M19 30c0-9 6-14 13-14s13 5 13 14c-3-3-6-5-13-5s-10 2-13 5z" fill="#3A2B25"/>
  <path d="M17 22c4-8 26-8 30 0l-2 4H19z" fill="var(--ink)"/>
  <rect x="17" y="24" width="30" height="3" rx="1.5" fill="var(--ink)"/>
  <circle cx="32" cy="19" r="2.6" fill="var(--sun)"/>
  <circle cx="27" cy="32" r="1.6" fill="var(--ink)"/><circle cx="37" cy="32" r="1.6" fill="var(--ink)"/>
  <path d="M28 37c2 2 6 2 8 0" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;
  }
  var AV = [["#F5A623", "#3A2B25"], ["#17807E", "#1C1A24"], ["#E8604C", "#7A4A2A"], ["#3C9D5D", "#C9862B"], ["#8A5BB8", "#2E2A3B"], ["#3B6FB6", "#B5652E"]];
  function avatar(i, size = 44) {
    const [bg, hair] = AV[i % AV.length];
    const hairs = [
      `<path d="M14 24c0-8 6-12 12-12s12 4 12 12c-3-4-7-5-12-5s-9 1-12 5z" fill="${hair}"/>`,
      `<path d="M13 26c-1-10 6-15 13-15s14 5 13 15c-2-1-3-6-6-7-4 3-10 3-14 0-3 1-4 6-6 7z" fill="${hair}"/>`,
      `<rect x="13" y="12" width="26" height="8" rx="4" fill="${hair}"/><rect x="11" y="18" width="30" height="3" rx="1.5" fill="${hair}"/>`,
      `<path d="M14 24c0-9 6-13 12-13s12 4 12 13l-3 8c-1-8-4-12-9-12s-8 4-9 12z" fill="${hair}"/>`,
      `<circle cx="18" cy="15" r="5" fill="${hair}"/><circle cx="34" cy="15" r="5" fill="${hair}"/><path d="M15 22c0-6 5-9 11-9s11 3 11 9" fill="${hair}"/>`,
      `<path d="M15 20c3-7 19-7 22 0v3H15z" fill="${hair}"/><rect x="24" y="9" width="4" height="6" rx="2" fill="${hair}"/>`
    ];
    return `<svg width="${size}" height="${size}" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25" fill="${bg}"/>
  <path d="M10 50c2-8 8-12 16-12s14 4 16 12" fill="#FFF8EE" opacity=".9"/><circle cx="26" cy="25" r="10" fill="#E2B48C"/>
  ${hairs[i % hairs.length]}<circle cx="22.5" cy="26" r="1.3" fill="#2E2A3B"/><circle cx="29.5" cy="26" r="1.3" fill="#2E2A3B"/>
  <path d="M23 30c1.6 1.4 4.4 1.4 6 0" stroke="#2E2A3B" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
  }
  function building(ch) {
    const c = ch.color;
    const roof = (y) => `<path d="M14 ${y}L60 ${y - 26}L106 ${y}z" fill="${c}"/>`;
    const base = `<rect x="6" y="88" width="108" height="6" rx="3" fill="var(--grass-dark)"/>`;
    const door = `<rect x="52" y="64" width="16" height="24" rx="8" fill="var(--ink)" opacity=".85"/>`;
    const walls = `<rect x="20" y="46" width="80" height="42" rx="3" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>`;
    const win = (x) => `<rect x="${x}" y="54" width="14" height="12" rx="2" fill="var(--sky)" stroke="var(--ink)" stroke-width="1.5"/>`;
    const sign = {
      hall: `<circle cx="60" cy="32" r="13" fill="${c}"/><rect x="58" y="10" width="4" height="10" fill="var(--ink)"/><path d="M62 10h10l-3 3 3 3H62z" fill="var(--coral)"/>${walls}<rect x="28" y="50" width="6" height="38" fill="${c}" opacity=".5"/><rect x="86" y="50" width="6" height="38" fill="${c}" opacity=".5"/>${door}`,
      lock: `${roof(46)}${walls}${win(28)}${win(78)}${door}<rect x="50" y="26" width="20" height="14" rx="3" fill="var(--sun)"/><path d="M54 26v-4a6 6 0 0 1 12 0v4" stroke="var(--ink)" stroke-width="2.5" fill="none"/>`,
      mail: `${roof(46)}${walls}${win(28)}${win(78)}${door}<rect x="47" y="24" width="26" height="16" rx="2" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M47 25l13 9 13-9" stroke="var(--ink)" stroke-width="2" fill="none"/>`,
      tools: `${roof(46)}${walls}${win(28)}${win(78)}${door}<path d="M50 38l12-12m-4 0h6v6" stroke="var(--ink)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="50" cy="38" r="3" fill="var(--sun)"/>`,
      gate: `<rect x="14" y="30" width="22" height="58" fill="${c}"/><rect x="84" y="30" width="22" height="58" fill="${c}"/><path d="M14 30h22v-6h-5v4h-4v-4h-4v4h-4v-4h-5zM84 30h22v-6h-5v4h-4v-4h-4v4h-4v-4h-5z" fill="${c}"/><path d="M36 88V50a24 24 0 0 1 48 0v38" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${[44, 52, 60, 68, 76].map((x) => `<rect x="${x - 1}" y="44" width="2.5" height="44" fill="var(--ink)"/>`).join("")}`,
      workshop: `<path d="M14 46l30-20 16 10 16-10 30 20z" fill="${c}"/>${walls}${win(28)}${win(78)}${door}<circle cx="60" cy="36" r="6" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>`,
      tower: `<rect x="44" y="30" width="32" height="58" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M38 30l22-20 22 20z" fill="${c}"/><rect x="50" y="40" width="20" height="12" rx="2" fill="var(--sky)" stroke="var(--ink)" stroke-width="1.5"/><ellipse cx="60" cy="46" rx="6" ry="4" fill="var(--paper)"/><circle cx="60" cy="46" r="2.4" fill="var(--ink)"/><rect x="54" y="66" width="12" height="22" rx="6" fill="var(--ink)" opacity=".85"/>`,
      shield: `<rect x="20" y="46" width="80" height="42" rx="3" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M60 14l22 8v14c0 14-10 22-22 26-12-4-22-12-22-26V22z" fill="${c}"/><path d="M52 34l6 6 11-12" stroke="var(--sun)" stroke-width="3.5" fill="none" stroke-linecap="round"/>${door}`
    };
    return svg("0 0 120 96", sign[ch.icon] + base, ch.place);
  }
  function art(key) {
    const T = (x, y, t, cls = "a-t") => `<text x="${x}" y="${y}" class="${cls}">${t}</text>`;
    const box = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="var(--ink)" stroke-width="2"/>`;
    const env = (x, y, fill = "var(--paper)") => `<g transform="translate(${x} ${y})"><rect width="64" height="42" rx="5" fill="${fill}" stroke="var(--ink)" stroke-width="2"/><path d="M0 2l32 22L64 2" stroke="var(--ink)" stroke-width="2" fill="none"/></g>`;
    const A = {
      town: `${[[20, "var(--sun)"], [92, "var(--teal)"], [164, "var(--coral)"], [236, "var(--leaf)"]].map(([x, c]) => `<rect x="${x}" y="${90 - Number(x) % 3 * 12}" width="56" height="${70 + Number(x) % 3 * 12}" rx="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M${Number(x) - 4} ${92 - Number(x) % 3 * 12}l32-24 32 24z" fill="${c}"/><rect x="${Number(x) + 20}" y="136" width="16" height="24" rx="8" fill="var(--ink)" opacity=".8"/>`).join("")}<rect x="0" y="160" width="320" height="10" rx="5" fill="var(--grass-dark)"/><path d="M40 40c20-20 60-20 80 0" stroke="var(--teal)" stroke-width="3" fill="none" stroke-dasharray="6 6"/><path d="M200 40c20-20 60-20 80 0" stroke="var(--teal)" stroke-width="3" fill="none" stroke-dasharray="6 6"/>`,
      cia: `<path d="M160 18L292 176H28z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="160" cy="28" r="22" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>${T(152, 36, "C", "a-big")}<circle cx="40" cy="166" r="22" fill="var(--teal)" stroke="var(--ink)" stroke-width="2"/>${T(33, 174, "I", "a-big a-light")}<circle cx="280" cy="166" r="22" fill="var(--coral)" stroke="var(--ink)" stroke-width="2"/>${T(271, 174, "A", "a-big a-light")}${T(115, 120, "Protect all three")}`,
      attackers: `${box(20, 40, 84, 110, "var(--sun)")}${box(118, 40, 84, 110, "var(--sky)")}${box(216, 40, 84, 110, "var(--coral-soft)")}${T(46, 102, "$", "a-big")}${T(140, 100, "KEY", "a-mid")}${T(232, 100, "WOW", "a-mid")}${T(36, 172, "Money")}${T(136, 172, "Secrets")}${T(228, 172, "Show off")}`,
      password: `${box(24, 40, 272, 44, "var(--paper)")}${T(40, 68, "dragon123", "a-mono")}<rect x="186" y="56" width="96" height="12" rx="6" fill="var(--line)"/><rect x="186" y="56" width="22" height="12" rx="6" fill="var(--coral)"/>${box(24, 110, 272, 44, "var(--paper)")}${T(40, 138, "blue-river-pizza-cloud", "a-mono")}<rect x="236" y="126" width="46" height="12" rx="6" fill="var(--leaf)"/>${T(40, 186, "Longer = stronger")}`,
      mfa: `${box(30, 40, 110, 110, "var(--sun-soft)")}${T(58, 100, "****", "a-mono")}${T(42, 172, "Something you know")}${T(156, 98, "+", "a-big")}${box(186, 34, 74, 122, "var(--sky)")}<rect x="198" y="52" width="50" height="60" rx="4" fill="var(--paper)"/>${T(205, 88, "482 913", "a-mono-s")}<circle cx="223" cy="134" r="7" fill="var(--paper)"/>${T(172, 172, "Something you have")}`,
      phish: `<path d="M40 100c40-50 140-50 180 0-40 50-140 50-180 0z" fill="var(--sky)" stroke="var(--ink)" stroke-width="2.5"/><path d="M220 100l40-30v60z" fill="var(--sky)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="80" cy="92" r="6" fill="var(--ink)"/>${env(120, 78, "var(--paper)")}<path d="M60 20v40" stroke="var(--ink)" stroke-width="2"/><path d="M60 60c0 12 14 12 14 0" stroke="var(--ink)" stroke-width="2.5" fill="none"/>${T(100, 186, "Fake message, real hook")}`,
      flags: `${box(20, 24, 280, 150, "var(--paper)")}${T(36, 54, "From: support@netfIix-help.co", "a-mono-s")}${T(36, 84, "URGENT: account closes in 1 hour", "a-mono-s")}${T(36, 114, "Click here and type your password", "a-mono-s")}${[48, 78, 108].map((y) => `<path d="M286 ${y - 12}v18" stroke="var(--ink)" stroke-width="2"/><path d="M286 ${y - 12}h-14l4 5-4 5h14z" fill="var(--coral)"/>`).join("")}${T(36, 156, "3 red flags in one email", "a-t")}`,
      report: `${[["STOP", "var(--coral)", 20], ["CHECK", "var(--sun)", 118], ["REPORT", "var(--leaf)", 216]].map(([t, c, x]) => `<circle cx="${Number(x) + 42}" cy="88" r="42" fill="${c}" stroke="var(--ink)" stroke-width="2"/>${T(Number(x) + (String(t).length > 4 ? 14 : 22), 95, String(t), "a-mid")}`).join("")}<path d="M106 88h8m90 0h8" stroke="var(--ink)" stroke-width="3"/>`,
      controls: `${box(18, 30, 88, 130, "var(--sun-soft)")}${box(116, 30, 88, 130, "var(--sky)")}${box(214, 30, 88, 130, "var(--leaf-soft)")}<rect x="48" y="80" width="28" height="22" rx="4" fill="var(--ink)"/><path d="M53 80v-8a9 9 0 0 1 18 0v8" stroke="var(--ink)" stroke-width="4" fill="none"/><rect x="138" y="76" width="34" height="22" rx="4" fill="var(--ink)"/><path d="M172 82l12-6v22l-12-6z" fill="var(--ink)"/><path d="M240 92a20 20 0 1 0 6-16" stroke="var(--ink)" stroke-width="4" fill="none"/><path d="M244 66l2 12 12-4" stroke="var(--ink)" stroke-width="4" fill="none"/>${T(36, 186, "Prevent")}${T(136, 186, "Detect")}${T(244, 186, "Fix")}`,
      controlKinds: `${box(18, 30, 88, 130, "var(--paper)")}${box(116, 30, 88, 130, "var(--paper)")}${box(214, 30, 88, 130, "var(--paper)")}${[40, 54, 68, 82].map((x) => `<rect x="${x}" y="70" width="6" height="56" fill="var(--ink)"/>`).join("")}<rect x="36" y="80" width="56" height="5" fill="var(--ink)"/><rect x="134" y="66" width="52" height="38" rx="4" fill="var(--sky)" stroke="var(--ink)" stroke-width="2"/><rect x="150" y="104" width="20" height="10" fill="var(--ink)"/><rect x="234" y="58" width="48" height="66" rx="3" fill="var(--sun-soft)" stroke="var(--ink)" stroke-width="2"/>${[74, 86, 98, 110].map((y) => `<rect x="242" y="${y}" width="32" height="4" rx="2" fill="var(--ink)" opacity=".6"/>`).join("")}${T(30, 186, "Physical")}${T(128, 186, "Technical")}${T(212, 186, "Administrative", "a-t a-small")}`,
      packet: `${env(30, 60, "var(--sun-soft)")}${env(128, 60, "var(--sun-soft)")}${env(226, 60, "var(--sun-soft)")}${T(30, 136, "From: 198.51.100.7", "a-mono-s")}${T(30, 156, "To: 10.0.1.10   Door: 443", "a-mono-s")}<path d="M98 81h26m72 0h26" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/>`,
      ports: `${[[24, "80", "var(--leaf-soft)"], [84, "443", "var(--leaf-soft)"], [144, "22", "var(--coral-soft)"], [204, "3389", "var(--coral-soft)"], [264, "445", "var(--coral-soft)"]].map(([x, t, c]) => `<rect x="${x}" y="50" width="44" height="80" rx="22" fill="${c}" stroke="var(--ink)" stroke-width="2"/>${T(Number(x) + (String(t).length > 3 ? 4 : String(t).length > 2 ? 9 : 14), 98, String(t), "a-mono")}`).join("")}${T(24, 166, "Open: 80, 443", "a-t")}${T(178, 166, "Shut: the rest", "a-t")}`,
      firewall: `${env(20, 70, "var(--sun-soft)")}<rect x="140" y="20" width="40" height="160" fill="var(--coral-soft)" stroke="var(--ink)" stroke-width="2"/>${[40, 70, 100, 130, 160].map((y) => `<path d="M140 ${y}h40" stroke="var(--ink)" stroke-width="1.5"/>`).join("")}<path d="M90 91h44" stroke="var(--ink)" stroke-width="2.5"/><path d="M128 85l8 6-8 6" fill="var(--ink)"/>${box(206, 56, 96, 74, "var(--paper)")}${T(216, 82, "Rules", "a-t")}${T(216, 104, "+ 80, 443", "a-mono-s")}${T(216, 120, "x the rest", "a-mono-s")}`,
      order: `${[["1", "Block bad IP", "var(--coral-soft)"], ["2", "Allow 443", "var(--leaf-soft)"], ["3", "Block everything", "var(--coral-soft)"]].map(([nn, t, c], i) => `${box(60, 22 + i * 54, 200, 42, c)}${T(76, 49 + i * 54, `${nn}.  ${t}`, "a-t")}`).join("")}<path d="M36 30v140" stroke="var(--teal)" stroke-width="3"/><path d="M28 162l8 12 8-12" fill="var(--teal)"/>${T(270, 49, "first", "a-t a-small")}`,
      ids: `<rect x="130" y="40" width="60" height="140" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="M120 40l40-30 40 30z" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/><ellipse cx="160" cy="76" rx="18" ry="11" fill="var(--sky)" stroke="var(--ink)" stroke-width="2"/><circle cx="160" cy="76" r="5" fill="var(--ink)"/>${env(20, 120, "var(--sun-soft)")}${env(236, 120, "var(--sun-soft)")}<path d="M142 86L70 124M178 86l72 38" stroke="var(--sun)" stroke-width="3" stroke-dasharray="5 5"/>`,
      signature: `${box(24, 26, 128, 150, "var(--paper)")}${T(44, 54, "WANTED", "a-mid")}${box(42, 70, 92, 50, "var(--coral-soft)")}${T(52, 101, "OR 1=1", "a-mono")}${T(44, 156, "Signature", "a-t")}${box(168, 26, 128, 150, "var(--paper)")}<path d="M184 140l18-14 18 6 18-20 18 4" stroke="var(--teal)" stroke-width="3" fill="none"/><path d="M256 116l16-72" stroke="var(--coral)" stroke-width="3"/><circle cx="272" cy="44" r="6" fill="var(--coral)"/>${T(188, 168, "Anomaly", "a-t")}`,
      ips: `${env(16, 80, "var(--sun-soft)")}<path d="M84 101h40" stroke="var(--ink)" stroke-width="2.5"/>${box(130, 50, 70, 100, "var(--teal)")}${T(146, 108, "IPS", "a-mid a-light")}<path d="M206 101h36" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="4 4"/><circle cx="270" cy="101" r="26" fill="var(--coral-soft)" stroke="var(--coral)" stroke-width="4"/><path d="M252 83l36 36" stroke="var(--coral)" stroke-width="5"/>${T(110, 184, "Sits in the path. Can block.")}`,
      castle: `<rect x="10" y="150" width="300" height="24" rx="12" fill="var(--sky)"/>${T(18, 168, "moat: training", "a-t a-small")}<rect x="40" y="60" width="240" height="92" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${[40, 80, 120, 160, 200, 240].map((x) => `<rect x="${x}" y="48" width="20" height="14" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>`).join("")}${T(50, 84, "wall: firewall", "a-t a-small")}<rect x="110" y="96" width="100" height="56" fill="var(--sun-soft)" stroke="var(--ink)" stroke-width="2"/>${T(118, 116, "guards: IPS", "a-t a-small")}<rect x="140" y="122" width="40" height="30" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/>${T(222, 116, "vault: MFA", "a-t a-small")}`
    };
    return svg("0 0 320 200", A[key], key);
  }

  // src/state.ts
  var KEY = "byteville-defenders-v1";
  var fresh = () => ({
    points: 0,
    stars: {},
    best: {},
    badges: [],
    done: [],
    unlocked: 1,
    streak: 0,
    bestStreak: 0,
    quick: 0,
    answered: 0,
    correct: 0,
    playMs: 0,
    nwSolved: [],
    nwUnlocked: 1,
    nwHints: {}
  });
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { profile: s.profile || null, progress: Object.assign(fresh(), s.progress || {}), sound: s.sound !== false };
      }
    } catch (_) {
    }
    return { profile: null, progress: fresh(), sound: true };
  }
  var store = load();
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (_) {
    }
  }
  function newSessionId() {
    const r = Math.random().toString(36).slice(2, 8);
    return `s-${Date.now().toString(36)}-${r}`;
  }
  function resetProgress() {
    store.progress = fresh();
    persist();
  }
  function rankFor(points) {
    let idx = 0;
    RANKS.forEach((r, i) => {
      if (points >= r[0]) idx = i;
    });
    return { name: RANKS[idx][1], floor: RANKS[idx][0], next: idx + 1 < RANKS.length ? RANKS[idx + 1][0] : null };
  }
  function award(id2) {
    const p = store.progress;
    if (p.badges.includes(id2)) return null;
    const b = BADGES.find((x) => x.id === id2);
    if (!b) return null;
    p.badges.push(id2);
    persist();
    return b.name;
  }
  function totalStars() {
    return Object.values(store.progress.stars).reduce((a, b) => a + b, 0);
  }
  var maxStars = () => CHAPTERS.length * 3;

  // src/tracker.ts
  function config() {
    const w = window;
    return w.BYTEVILLE_CONFIG || {};
  }
  var QUEUE_KEY = "byteville-queue-v1";
  var LOG_KEY = "byteville-log-v1";
  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (_) {
      return [];
    }
  }
  function write(key, v) {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (_) {
    }
  }
  var queue = read(QUEUE_KEY);
  var sending = false;
  function track(e) {
    const prof = store.profile;
    const full = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      session_id: prof ? prof.sessionId : "",
      student: prof ? prof.name : "",
      class_code: prof ? prof.classCode : "",
      chapter: "",
      item_id: "",
      prompt: "",
      choice: "",
      correct_answer: "",
      correct: "",
      time_ms: "",
      points: 0,
      total_points: store.progress.points,
      ...e
    };
    const log = read(LOG_KEY);
    log.push(full);
    write(LOG_KEY, log.slice(-3e3));
    if (config().trackingUrl) {
      queue.push(full);
      write(QUEUE_KEY, queue);
      if (queue.length >= 8 || e.event === "chapter_complete" || e.event === "finish") flush();
    }
  }
  async function flush() {
    const url = config().trackingUrl;
    if (!url || sending || queue.length === 0) return;
    sending = true;
    const batch = queue.slice(0, 50);
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ key: config().classKey || "", events: batch })
      });
      queue = queue.slice(batch.length);
      write(QUEUE_KEY, queue);
    } catch (_) {
    } finally {
      sending = false;
    }
  }
  setInterval(() => {
    void flush();
  }, 15e3);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  function trackingOn() {
    return !!config().trackingUrl;
  }
  async function leaderboard(classCode) {
    const c = config();
    if (!c.trackingUrl || c.showLeaderboard === false || !classCode) return null;
    try {
      const r = await fetch(`${c.trackingUrl}?action=leaderboard&class=${encodeURIComponent(classCode)}`);
      if (!r.ok) return null;
      const data = await r.json();
      return data.rows || [];
    } catch (_) {
      return null;
    }
  }
  function myCsv() {
    const cols = ["timestamp", "session_id", "student", "class_code", "event", "chapter", "item_id", "prompt", "choice", "correct_answer", "correct", "time_ms", "points", "total_points"];
    const esc2 = (v) => {
      const s = String(v != null ? v : "");
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [cols.join(",")].concat(read(LOG_KEY).map((e) => cols.map((k) => esc2(e[k])).join(","))).join("\n");
  }

  // src/ui.ts
  var $ = (sel, root = document) => root.querySelector(sel);
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var ac = null;
  function tone(freq, dur, type = "triangle", vol = 0.05, delay = 0) {
    if (!store.sound) return;
    try {
      const W = window;
      ac = ac || new (window.AudioContext || W.webkitAudioContext)();
      const o = ac.createOscillator();
      const g = ac.createGain();
      const t = ac.currentTime + delay;
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (_) {
    }
  }
  var sfx = {
    right: (streak = 0) => {
      const b = 520 + Math.min(streak, 8) * 40;
      tone(b, 0.1);
      tone(b * 1.5, 0.12, "triangle", 0.045, 0.07);
    },
    wrong: () => {
      tone(220, 0.18, "sine", 0.06);
      tone(165, 0.25, "sine", 0.05, 0.12);
    },
    click: () => tone(700, 0.04, "square", 0.02),
    badge: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, "triangle", 0.05, i * 0.1)),
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, "triangle", 0.055, i * 0.11)),
    gold: () => [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, "square", 0.03, i * 0.06))
  };
  var toastQ = [];
  var toastBusy = false;
  function toast(text, kind = "info") {
    if (kind === "info" && (toastBusy || toastQ.length)) return;
    toastQ.push(`<div class="toast-in ${kind}">${text}</div>`);
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const box = $("#toast");
    const t = toastQ.shift();
    if (!t) {
      toastBusy = false;
      box.hidden = true;
      return;
    }
    toastBusy = true;
    box.innerHTML = t;
    box.hidden = false;
    setTimeout(nextToast, toastQ.length ? 1800 : 2600);
  }
  function modal(markup, buttons) {
    const ov = $("#overlay");
    const box = $("#modal");
    box.innerHTML = markup + '<div class="modal-actions"></div>';
    const row = $(".modal-actions", box);
    buttons.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.className = "btn" + (b.primary ? " btn-primary" : "");
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        ov.hidden = true;
        b.onClick();
      });
      row.appendChild(btn);
      if (i === 0) setTimeout(() => btn.focus(), 30);
    });
    ov.hidden = false;
  }
  var modalOpen = () => !$("#overlay").hidden;
  function floatPoints(anchor, text, gold = false) {
    const r = anchor.getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "float-pts" + (gold ? " gold" : "");
    d.textContent = text;
    d.style.left = `${r.left + r.width / 2}px`;
    d.style.top = `${r.top + window.scrollY}px`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1e3);
  }
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#F5A623", "#17807E", "#E8604C", "#3C9D5D", "#8A5BB8", "#3B6FB6"];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.5 + "s";
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
  }
  function download(name, text, type = "text/csv") {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  // src/stages/common.ts
  var pick2 = (a) => a[Math.floor(Math.random() * a.length)];
  function stageHead(title, intro, count) {
    return `<div class="stage-head">
    <div><div class="eyebrow">Challenge</div><h2>${esc(title)}</h2><p class="stage-intro">${esc(intro)}</p></div>
    <div class="stage-count" aria-live="polite">${count}</div></div>`;
  }
  function feedback(box, ok, explain, pts, anchor, next, autoMs = 1500) {
    box.className = "feedback " + (ok ? "ok" : "no");
    box.innerHTML = `<div class="fb-title">${ok ? pick2(PRAISE) : pick2(ENCOURAGE)}${ok && pts ? ` <span class="fb-pts">+${pts}</span>` : ""}</div><p>${explain}</p>`;
    box.hidden = false;
    if (ok && anchor && pts) floatPoints(anchor, `+${pts}`);
    if (ok) {
      const t = setTimeout(next, autoMs);
      const skip = document.createElement("button");
      skip.className = "btn btn-small";
      skip.textContent = "Next";
      skip.addEventListener("click", () => {
        clearTimeout(t);
        next();
      });
      box.appendChild(skip);
    } else {
      const b = document.createElement("button");
      b.className = "btn btn-primary btn-small";
      b.textContent = "Got it, next";
      b.addEventListener("click", next);
      box.appendChild(b);
      setTimeout(() => b.focus(), 30);
    }
  }

  // src/stages/sort.ts
  function runSort(root, st, ctx) {
    const cards = st.cards.slice().sort(() => Math.random() - 0.5);
    let k = 0;
    let t0 = 0;
    let locked = false;
    const draw = () => {
      if (k >= cards.length) return ctx.done();
      const c = cards[k];
      locked = false;
      root.innerHTML = stageHead(st.title, st.intro, `${k + 1} / ${cards.length}`) + `
      <div class="sort-card" tabindex="-1">${esc(c.text)}</div>
      <div class="bins">${st.bins.map((b, i) => `<button class="bin" data-i="${i}"><span class="bin-key">${i + 1}</span><b>${esc(b.label)}</b><small>${esc(b.hint)}</small></button>`).join("")}</div>
      <div class="feedback" hidden></div>`;
      t0 = performance.now();
      root.querySelectorAll(".bin").forEach((btn) => btn.addEventListener("click", () => choose(Number(btn.dataset.i), btn)));
    };
    const choose = (i, btn) => {
      if (locked) return;
      locked = true;
      const c = cards[k];
      const ok = i === c.bin;
      root.querySelectorAll(".bin").forEach((b, j) => {
        b.disabled = true;
        if (j === c.bin) b.classList.add("is-right");
        else if (j === i) b.classList.add("is-wrong");
      });
      const pts = ctx.answer({ itemId: c.id, prompt: c.text, choice: st.bins[i].label, correctAnswer: st.bins[c.bin].label, correct: ok, timeMs: performance.now() - t0 });
      ok ? sfx.right() : sfx.wrong();
      feedback(root.querySelector(".feedback"), ok, c.explain, pts, btn, () => {
        k++;
        draw();
      });
    };
    const onKey = (e) => {
      if (!document.body.contains(root) || !root.querySelector(".bins")) {
        document.removeEventListener("keydown", onKey);
        return;
      }
      const n2 = Number(e.key);
      if (n2 >= 1 && n2 <= st.bins.length && !locked) {
        const btn = root.querySelector(`.bin[data-i="${n2 - 1}"]`);
        choose(n2 - 1, btn);
      }
    };
    document.addEventListener("keydown", onKey);
    draw();
  }

  // src/stages/choice.ts
  function askOne(box, item, style, onAnswer, next) {
    const t0 = performance.now();
    let locked = false;
    box.innerHTML = `<p class="q-prompt">${esc(item.prompt)}</p>
    <div class="${style === "pair" ? "pair" : "opts"}">${item.options.map((o, i) => `<button class="${style === "pair" ? "pair-card" : "opt"}" data-i="${i}">${style === "pair" ? `<span class="pair-tag">${i === 0 ? "Left" : "Right"}</span><span class="pair-text">${esc(o)}</span>` : `<span class="opt-key">${String.fromCharCode(65 + i)}</span>${esc(o)}`}</button>`).join("")}</div>
    <div class="feedback" hidden></div>`;
    const buttons = Array.from(box.querySelectorAll("[data-i]"));
    buttons.forEach((b) => b.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      const i = Number(b.dataset.i);
      const ok = i === item.answer;
      buttons.forEach((x, j) => {
        x.disabled = true;
        if (j === item.answer) x.classList.add("is-right");
        else if (j === i) x.classList.add("is-wrong");
      });
      ok ? sfx.right() : sfx.wrong();
      const pts = onAnswer(i, ok, performance.now() - t0);
      feedback(box.querySelector(".feedback"), ok, item.explain, pts, b, next, 1800);
    }));
  }
  function runChoice(root, st, ctx) {
    let k = 0;
    const draw = () => {
      if (k >= st.items.length) return ctx.done();
      const item = st.items[k];
      root.innerHTML = stageHead(st.title, st.intro, `${k + 1} / ${st.items.length}`) + '<div class="q-box"></div>';
      askOne(
        root.querySelector(".q-box"),
        item,
        st.style || "list",
        (i, ok, ms) => ctx.answer({ itemId: item.id, prompt: item.prompt, choice: item.options[i], correctAnswer: item.options[item.answer], correct: ok, timeMs: ms }),
        () => {
          k++;
          draw();
        }
      );
    };
    draw();
  }

  // src/stages/inbox.ts
  function runInbox(root, st, ctx) {
    const result = {};
    let current = 0;
    let t0 = performance.now();
    const left = () => st.emails.filter((m) => result[m.id] === void 0).length;
    const draw = () => {
      const m = st.emails[current];
      const answered = result[m.id] !== void 0;
      root.innerHTML = stageHead(st.title, st.intro, `${st.emails.length - left()} / ${st.emails.length} checked`) + `
    <div class="inbox">
      <ul class="mail-list" role="list">${st.emails.map((e, i) => {
        const r = result[e.id];
        const tag = r === void 0 ? '<span class="mail-tag new">New</span>' : r ? '<span class="mail-tag ok">Done</span>' : '<span class="mail-tag no">Missed</span>';
        return `<li><button class="mail-item${i === current ? " on" : ""}" data-i="${i}"><span class="mail-from">${esc(e.from)}${e.kind === "text" ? " <small>(text)</small>" : ""}</span>${tag}<span class="mail-sub">${esc(e.subject)}</span></button></li>`;
      }).join("")}</ul>
      <article class="mail-read">
        <div class="mail-meta"><div class="mail-avatar">${esc(m.from.charAt(0))}</div>
          <div><b>${esc(m.from)}</b><div class="mono small">${esc(m.address)}</div></div></div>
        <h3>${esc(m.subject)}</h3>
        <p>${esc(m.body)}</p>
        ${m.link ? `<p class="fake-link">${esc(m.link)}</p>` : ""}
        ${answered ? `<div class="clues"><b>${m.phish ? "Phish! Clues:" : "Safe. Why:"}</b><ul>${m.clues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : `
        <div class="mail-actions"><button class="btn btn-safe" data-a="safe">Safe</button><button class="btn btn-phish" data-a="phish">Phish</button></div>`}
        <div class="feedback" hidden></div>
      </article>
    </div>`;
      root.querySelectorAll(".mail-item").forEach((b) => b.addEventListener("click", () => {
        current = Number(b.dataset.i);
        t0 = performance.now();
        draw();
      }));
      root.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => decide(b.dataset.a === "phish", b)));
    };
    const decide = (saysPhish, btn) => {
      const m = st.emails[current];
      if (result[m.id] !== void 0) return;
      const ok = saysPhish === m.phish;
      result[m.id] = ok;
      ok ? sfx.right() : sfx.wrong();
      const pts = ctx.answer({ itemId: m.id, prompt: `${m.from}: ${m.subject}`, choice: saysPhish ? "Phish" : "Safe", correctAnswer: m.phish ? "Phish" : "Safe", correct: ok, timeMs: performance.now() - t0 });
      draw();
      const fb = root.querySelector(".feedback");
      const msg = m.phish ? `This one is a phish. Look at the clues above.` : `This one is safe. Look at why above.`;
      feedback(fb, ok, msg, pts, root.querySelector(".mail-read h3") || btn, () => {
        if (left() === 0) return ctx.done();
        const nextIdx = st.emails.findIndex((e) => result[e.id] === void 0);
        current = nextIdx;
        t0 = performance.now();
        draw();
      }, 2600);
    };
    draw();
  }

  // src/stages/lane.ts
  function runLane(root, st, ctx) {
    const packets = st.packets();
    let k = 0;
    let raf = 0;
    let t0 = 0;
    let busy = true;
    let el = null;
    let paused = false;
    const icon = (kind) => kind === "allow" ? "ALLOW" : kind === "alert" ? "CHECK" : "BLOCK";
    root.innerHTML = stageHead(st.title, st.intro, `1 / ${packets.length}`) + `
  <div class="lane-grid">
    <div class="lane-main">
      <div class="lane" aria-live="polite">
        <span class="lane-label l">${esc(st.left)}</span><span class="lane-label r">${esc(st.right)}</span>
        <div class="wall"><span>${esc(st.wall)}</span></div>
        <div class="school" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="timer"><i></i></div>
      </div>
      <div class="lane-actions">
        <button class="act act-yes" data-a="1">${esc(st.yes)}<small>key A</small></button>
        <button class="act act-no" data-a="0">${esc(st.no)}<small>key B</small></button>
      </div>
      <div class="lane-note" aria-live="polite">Read the packet, check the rules, then decide.</div>
    </div>
    <aside class="rulebook">
      <h3>Your rules</h3>
      <ol>${st.rules.map((r) => `<li><span class="rk ${r.kind}">${icon(r.kind)}</span>${esc(r.text)}</li>`).join("")}</ol>
      ${(st.chips || []).map((c2) => `<div class="chips"><b>${esc(c2.label)}</b>${c2.values.map((v) => `<span class="chip">${esc(v)}</span>`).join("")}</div>`).join("")}
      <p class="small muted">Checked from top to bottom. First match wins.</p>
    </aside>
  </div>`;
    const lane = root.querySelector(".lane");
    const timer = root.querySelector(".timer i");
    const note = root.querySelector(".lane-note");
    const count = root.querySelector(".stage-count");
    const buttons = Array.from(root.querySelectorAll(".act"));
    const next = () => {
      if (!document.body.contains(lane)) return cleanup();
      if (k >= packets.length) {
        cleanup();
        return ctx.done();
      }
      const p = packets[k];
      count.textContent = `${k + 1} / ${packets.length}`;
      el = document.createElement("div");
      el.className = "pkt" + (p.golden ? " golden" : "");
      el.innerHTML = `${p.golden ? '<span class="gold-tag">GOLD x3</span>' : ""}
      <div class="pk-row"><span>FROM</span><b>${esc(p.from)}</b> <em>${esc(p.who)}</em></div>
      <div class="pk-row"><span>PORT</span><b>${p.port}</b> <em>${esc(PORT_NAMES[p.port] || "")}</em></div>
      ${p.msg ? `<div class="pk-msg">${esc(p.msg)}</div>` : ""}`;
      lane.appendChild(el);
      busy = false;
      buttons.forEach((b) => b.disabled = false);
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const tick = (now) => {
      if (busy || !el) return;
      if (!document.body.contains(lane)) return cleanup();
      if (paused || modalOpen()) {
        t0 += 16;
        raf = requestAnimationFrame(tick);
        return;
      }
      const f = Math.min(1, (now - t0) / (st.seconds * 1e3));
      const wall = root.querySelector(".wall").offsetLeft;
      const max = Math.max(8, wall - el.offsetWidth - 10);
      el.style.left = `${8 + (max - 8) * f}px`;
      timer.style.width = `${(1 - f) * 100}%`;
      timer.classList.toggle("low", f > 0.7);
      if (f >= 1) {
        decide(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const decide = (yes) => {
      if (busy || !el) return;
      busy = true;
      cancelAnimationFrame(raf);
      buttons.forEach((b) => b.disabled = true);
      const p = packets[k];
      const ms = performance.now() - t0;
      const ok = yes === p.allow;
      const speed = ok ? Math.max(0, Math.round(15 * (1 - ms / (st.seconds * 1e3)))) : 0;
      const gold = ok && p.golden ? 30 : 0;
      const pts = ctx.answer({
        itemId: `${ctx.chapter.id}-lane-${p.cat}`,
        prompt: `${p.from} port ${p.port}${p.msg ? " msg: " + p.msg : ""}`,
        choice: yes === null ? "too slow" : yes ? st.yes : st.no,
        correctAnswer: p.allow ? st.yes : st.no,
        correct: ok,
        timeMs: ms,
        bonus: speed + gold
      });
      if (ok && ms < 4e3) {
        store.progress.quick++;
        persist();
        if (store.progress.quick >= 5) {
          const b = award("quick");
          if (b) toast(`Badge unlocked: <b>${b}</b>`, "badge");
        }
      }
      if (gold) {
        sfx.gold();
        const b = award("golden");
        if (b) toast(`Badge unlocked: <b>${b}</b>`, "badge");
      } else if (ok) sfx.right(store.progress.streak);
      else sfx.wrong();
      const cur = el;
      cur.classList.add(p.allow ? "go" : "stop");
      if (ok) {
        floatPoints(cur, `+${pts}`, !!gold);
        note.className = "lane-note ok";
        note.innerHTML = `<b>Right: ${p.allow ? st.yes : st.no}.</b> ${esc(p.why)}`;
        setTimeout(() => {
          cur.remove();
          k++;
          next();
        }, 700);
      } else {
        note.className = "lane-note no";
        note.innerHTML = `<b>The answer was ${p.allow ? st.yes : st.no}.</b> ${esc(p.why)}`;
        modal(
          `<h3>${yes === null ? "Too slow! Decide before the timer runs out." : "Not quite."}</h3><p>The answer was <b>${p.allow ? st.yes : st.no}</b>.</p><p>${esc(p.why)}</p>`,
          [{ label: "Got it", primary: true, onClick: () => {
            cur.remove();
            k++;
            next();
          } }]
        );
      }
    };
    buttons.forEach((b) => b.addEventListener("click", () => decide(b.dataset.a === "1")));
    const onKey = (e) => {
      if (!document.body.contains(lane)) return cleanup();
      if (modalOpen()) return;
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") {
        e.preventDefault();
        decide(true);
      }
      if (key === "b" || key === "arrowright") {
        e.preventDefault();
        decide(false);
      }
    };
    const onVis = () => {
      paused = document.visibilityState === "hidden";
    };
    function cleanup() {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    let c = 3;
    const cd = document.createElement("div");
    cd.className = "countdown";
    lane.appendChild(cd);
    const step = () => {
      if (!document.body.contains(lane)) return cleanup();
      if (c === 0) {
        cd.remove();
        next();
        return;
      }
      cd.textContent = String(c);
      c--;
      setTimeout(step, 700);
    };
    step();
  }

  // src/stages/order.ts
  var matches = (r, t) => (r.port === void 0 || r.port === t.port) && (r.ip === void 0 || r.ip === t.ip);
  function verdict(rules, t) {
    for (let i = 0; i < rules.length; i++) if (matches(rules[i], t)) return { allow: rules[i].action === "allow", by: i };
    return { allow: false, by: -1 };
  }
  function runOrder(root, st, ctx) {
    let p = 0;
    const drawPuzzle = (pz) => {
      const rules = pz.rules.slice();
      let tries = 0;
      let solved = false;
      let t0 = performance.now();
      const draw = (results) => {
        root.innerHTML = stageHead(st.title, st.intro, `Puzzle ${p + 1} / ${st.puzzles.length}`) + `
      <div class="order-grid">
        <div>
          <div class="goal"><b>Goal:</b> ${esc(pz.goal)}</div>
          <ol class="rule-list">${rules.map((r, i) => `<li class="rule-row ${r.action}">
            <span class="rule-num">${i + 1}</span><span class="rule-act">${r.action === "allow" ? "ALLOW" : "BLOCK"}</span><span class="rule-text">${esc(r.text.replace(/^(Allow|Block) /, ""))}</span>
            <span class="rule-move"><button class="mv" data-i="${i}" data-d="-1" aria-label="Move rule ${i + 1} up" ${i === 0 ? "disabled" : ""}>&uarr;</button><button class="mv" data-i="${i}" data-d="1" aria-label="Move rule ${i + 1} down" ${i === rules.length - 1 ? "disabled" : ""}>&darr;</button></span></li>`).join("")}</ol>
          <div class="row-gap"><button class="btn btn-primary" id="runTest">Test my rules</button>${tries > 0 ? '<button class="btn" id="hintBtn">Show a hint</button>' : ""}</div>
          <div class="hint" hidden>${esc(pz.hint)}</div>
        </div>
        <div class="tests"><h3>Test packets</h3>${pz.tests.map((t, i) => {
          const r = results ? results[i] : null;
          const pass = r ? r.allow === t.allow : null;
          return `<div class="test ${pass === null ? "" : pass ? "pass" : "fail"}"><div><b>${esc(t.label)}</b><div class="mono small">${esc(t.ip)} : ${t.port}</div></div>
            <div class="test-want">Should be <b>${t.allow ? "allowed" : "blocked"}</b>${r ? `<br><span class="small">Got ${r.allow ? "allowed" : "blocked"}${r.by >= 0 ? ` by rule ${r.by + 1}` : ""}</span>` : ""}</div></div>`;
        }).join("")}</div>
      </div>
      <div class="feedback" hidden></div>`;
        root.querySelectorAll(".mv").forEach((b) => b.addEventListener("click", () => {
          var _a;
          const i = Number(b.dataset.i), d = Number(b.dataset.d);
          [rules[i], rules[i + d]] = [rules[i + d], rules[i]];
          sfx.click();
          draw();
          (_a = root.querySelector(`.mv[data-i="${i + d}"][data-d="${d}"]`)) == null ? void 0 : _a.focus();
        }));
        root.querySelector("#runTest").addEventListener("click", test);
        const hb = root.querySelector("#hintBtn");
        if (hb) hb.addEventListener("click", () => {
          root.querySelector(".hint").hidden = false;
        });
      };
      const test = () => {
        if (solved) return;
        tries++;
        const res = pz.tests.map((t) => verdict(rules, t));
        const ok = res.every((r, i) => r.allow === pz.tests[i].allow);
        draw(res);
        const base = ok ? Math.max(10, 50 - (tries - 1) * 15) : 0;
        const pts = ctx.answer({
          itemId: `${pz.id}-try${tries}`,
          prompt: pz.goal,
          choice: rules.map((r) => r.text).join(" > "),
          correctAnswer: "all tests pass",
          correct: ok,
          timeMs: performance.now() - t0,
          base
        });
        t0 = performance.now();
        const fb = root.querySelector(".feedback");
        if (ok) {
          solved = true;
          root.querySelectorAll(".mv, #runTest, #hintBtn").forEach((b) => b.disabled = true);
          sfx.right();
          floatPoints(root.querySelector("#runTest"), `+${pts}`);
          feedback(fb, true, tries === 1 ? "First try! Every test packet went where it should." : "All test packets went where they should.", pts, null, () => {
            p++;
            p < st.puzzles.length ? drawPuzzle(st.puzzles[p]) : ctx.done();
          }, 2200);
        } else {
          sfx.wrong();
          fb.className = "feedback no";
          fb.hidden = false;
          fb.innerHTML = `<div class="fb-title">Some packets went the wrong way.</div><p>Look at the red tests. Which rule caught them? Move rules and test again.${tries >= 1 ? " You can also open a hint." : ""}</p>`;
        }
      };
      draw();
    };
    drawPuzzle(st.puzzles[0]);
  }

  // src/nightwatch/engine.ts
  var HOME_NET = "10.0.1.0/24";
  function ipToInt(ip) {
    const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const parts = m.slice(1).map(Number);
    if (parts.some((p) => p > 255)) return null;
    return (parts[0] << 24 >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }
  function validAddr(spec) {
    if (spec === "any" || spec === "$home_net") return true;
    const [ip, bits] = spec.split("/");
    if (ipToInt(ip) === null) return false;
    if (bits === void 0) return true;
    const b = Number(bits);
    return /^\d+$/.test(bits) && b >= 0 && b <= 32;
  }
  function addrMatches(spec, ip) {
    if (spec === "any") return true;
    if (spec === "$home_net") spec = HOME_NET;
    const [base, bits] = spec.split("/");
    const a = ipToInt(base), b = ipToInt(ip);
    if (a === null || b === null) return false;
    if (bits === void 0) return a === b;
    const n2 = Number(bits);
    if (n2 === 0) return true;
    const mask = 4294967295 << 32 - n2 >>> 0;
    return (a & mask) >>> 0 === (b & mask) >>> 0;
  }
  function parsePorts(tok) {
    if (tok === "any") return "any";
    const list = tok.split(",").map((s) => s.trim());
    if (list.some((s) => !/^\d+$/.test(s) || Number(s) > 65535)) return null;
    return list.map(Number);
  }
  var ACTIONS = { allow: "allow", accept: "allow", pass: "allow", block: "block", deny: "block", drop: "block" };
  function parseFirewall(src) {
    const rules = [];
    const errors = [];
    src.split("\n").forEach((raw, i) => {
      const text = raw.replace(/#.*$/, "").trim();
      if (!text) return;
      const t = text.toLowerCase().split(/\s+/);
      const where = `Line ${i + 1}`;
      if (t.length < 6 || t.length > 7) {
        errors.push(`${where}: expected 6 parts, like  allow tcp any -> 10.0.1.10 443`);
        return;
      }
      const [act, proto, s, arrow, d, port, extra] = t;
      if (!ACTIONS[act]) {
        errors.push(`${where}: start with allow or block, not "${act}".`);
        return;
      }
      if (!["tcp", "udp", "icmp", "any"].includes(proto)) {
        errors.push(`${where}: protocol must be tcp, udp, icmp, or any.`);
        return;
      }
      if (arrow !== "->") {
        errors.push(`${where}: put  ->  between the source and the destination.`);
        return;
      }
      if (!validAddr(s)) {
        errors.push(`${where}: "${s}" is not a valid source. Use any, an IP, or a block like 10.0.2.0/24.`);
        return;
      }
      if (!validAddr(d)) {
        errors.push(`${where}: "${d}" is not a valid destination.`);
        return;
      }
      const ports = parsePorts(port);
      if (ports === null) {
        errors.push(`${where}: "${port}" is not a valid port. Use any, 443, or 80,443.`);
        return;
      }
      if (extra !== void 0 && extra !== "established") {
        errors.push(`${where}: the only word allowed at the end is "established".`);
        return;
      }
      rules.push({ line: i + 1, text, action: ACTIONS[act], proto, src: s, dst: d, ports, established: extra === "established" });
    });
    return { rules, errors };
  }
  function fwMatch(r, p) {
    if (r.proto !== "any" && r.proto !== p.proto) return false;
    if (!addrMatches(r.src, p.src) || !addrMatches(r.dst, p.dst)) return false;
    if (r.ports !== "any") {
      if (p.proto === "icmp" || !r.ports.includes(p.port)) return false;
    }
    if (r.established && p.state !== "est") return false;
    return true;
  }
  function fwDecide(rules, p) {
    for (let i = 0; i < rules.length; i++) if (fwMatch(rules[i], p)) return { got: rules[i].action, by: i };
    return { got: "allow", by: -1 };
  }
  function parseIds(src) {
    const rules = [];
    const errors = [];
    src.split("\n").forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      const where = `Line ${i + 1}`;
      const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*\((.*)\)\s*$/);
      if (!m) {
        errors.push(`${where}: expected  alert tcp any any -> $HOME_NET 80 (content:"..."; )`);
        return;
      }
      const [, act, proto, s, sp, arrow, d, dp, opts] = m;
      if (act.toLowerCase() !== "alert") {
        errors.push(`${where}: detection rules start with alert.`);
        return;
      }
      const pr = proto.toLowerCase();
      if (!["tcp", "udp", "icmp", "ip"].includes(pr)) {
        errors.push(`${where}: protocol must be tcp, udp, icmp, or ip.`);
        return;
      }
      if (arrow !== "->") {
        errors.push(`${where}: put  ->  between source and destination.`);
        return;
      }
      if (!validAddr(s.toLowerCase()) || !validAddr(d.toLowerCase())) {
        errors.push(`${where}: check the addresses. Use any, an IP, a block like 10.0.1.0/24, or $HOME_NET.`);
        return;
      }
      const sport = parsePorts(sp.toLowerCase()), dport = parsePorts(dp.toLowerCase());
      if (sport === null || dport === null) {
        errors.push(`${where}: ports must be any, a number, or a list like 80,443.`);
        return;
      }
      const contents = [];
      let msg = "";
      const re = /\s*([a-z_]+)\s*(?::\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*)))?\s*;/gi;
      const body = opts.trim().endsWith(";") ? opts : opts + ";";
      let k;
      let consumed = 0;
      while (k = re.exec(body)) {
        consumed += k[0].length;
        const key = k[1].toLowerCase();
        if (key === "content") {
          if (k[2] === void 0) {
            errors.push(`${where}: content needs quotes, like content:"OR 1=1";`);
            return;
          }
          contents.push({ text: k[2].replace(/\\(.)/g, "$1"), nocase: false });
        } else if (key === "nocase") {
          if (!contents.length) {
            errors.push(`${where}: nocase must come after a content.`);
            return;
          }
          contents[contents.length - 1].nocase = true;
        } else if (key === "msg") {
          msg = k[2] || "";
        } else if (key === "sid" || key === "rev" || key === "classtype") {
        } else {
          errors.push(`${where}: Night Watch understands content, nocase, msg, sid and rev. "${key}" is not one of them.`);
          return;
        }
      }
      if (body.slice(consumed).trim()) {
        errors.push(`${where}: check the options. Each one ends with a semicolon.`);
        return;
      }
      if (!contents.length) {
        errors.push(`${where}: add at least one content:"..."; so the rule knows what to look for.`);
        return;
      }
      rules.push({ line: i + 1, proto: pr, src: s.toLowerCase(), sport, dst: d.toLowerCase(), dport, contents, msg });
    });
    return { rules, errors };
  }
  function idsFires(r, e) {
    if (r.proto !== "ip" && r.proto !== e.proto) return false;
    if (!addrMatches(r.src, e.src) || !addrMatches(r.dst, e.dst)) return false;
    if (r.dport !== "any" && !r.dport.includes(e.port)) return false;
    return r.contents.every((c) => c.nocase ? e.payload.toLowerCase().includes(c.text.toLowerCase()) : e.payload.includes(c.text));
  }
  function idsDecide(rules, e) {
    for (let i = 0; i < rules.length; i++) if (idsFires(rules[i], e)) return { got: "alert", by: i };
    return { got: "quiet", by: -1 };
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clock(startSec) {
    const s = (startSec % 86400 + 86400) % 86400;
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return [h, m, x].map((v) => String(v).padStart(2, "0")).join(":");
  }

  // src/nightwatch/levels.ts
  var NETWORK = [
    ["10.0.1.10", "Web server (websites on 80 and 443)"],
    ["10.0.1.53", "DNS server (name lookups, UDP 53)"],
    ["10.0.1.0/24", "All servers. Same as $HOME_NET"],
    ["10.0.5.0/24", "Admin laptops (IT staff)"],
    ["10.0.2.0/24", "Student laptops"],
    ["10.0.0.0/8", "Everything inside Byteville"],
    ["203.0.113.0/24", 'The "bad neighborhood" (known attackers)']
  ];
  var P = (label, proto, src, dst, port, want, state = "new") => ({ label, proto, src, dst, port, want, state });
  var E = (label, payload, want, dst = "10.0.1.10", port = 80, src = "198.51.100.40") => ({ label, proto: "tcp", src, dst, port, payload, want });
  var FW_HEADER = "date       time     action proto src-ip          dst-ip      src-port dst-port";
  function fwLine(t, action, proto, src, dst, sp, dp) {
    return `2026-10-06 ${clock(t)} ${action.padEnd(6)} ${proto.padEnd(5)} ${src.padEnd(15)} ${dst.padEnd(11)} ${String(sp).padEnd(8)} ${dp}`;
  }
  var VISITORS = (r) => `${["198.51.100", "192.0.2"][Math.floor(r() * 2)]}.${2 + Math.floor(r() * 240)}`;
  function knockLog() {
    const r = rng(301);
    const rows = [];
    let t = 22 * 3600 + 5 * 60;
    for (let i = 0; i < 70; i++) {
      t += 3 + Math.floor(r() * 25);
      const port = r() < 0.75 ? 443 : 80;
      rows.push([t, fwLine(t, "ALLOW", "TCP", VISITORS(r), "10.0.1.10", 49152 + Math.floor(r() * 16e3), port)]);
    }
    for (const [ip, p] of [["192.0.2.14", 22], ["198.51.100.201", 3389], ["192.0.2.88", 23]]) {
      const at = 22 * 3600 + 5 * 60 + Math.floor(r() * 1500);
      rows.push([at, fwLine(at, "DROP", "TCP", ip, "10.0.1.10", 5e4 + Math.floor(r() * 9e3), p)]);
    }
    const scanner = "198.51.100.173";
    let st = 22 * 3600 + 17 * 60 + 41;
    [21, 22, 23, 25, 110, 135, 139, 445, 1433, 3306, 3389, 5900].forEach((p, i) => {
      st += r() < 0.5 ? 0 : 1;
      rows.push([st, fwLine(st, "DROP", "TCP", scanner, "10.0.1.10", 40100 + i, p)]);
    });
    rows.sort((a, b) => a[0] - b[0]);
    return { log: rows.map((x) => x[1]), answer: scanner };
  }
  function openDoorLog() {
    const r = rng(402);
    const rows = [];
    let t = 23 * 3600;
    for (let i = 0; i < 80; i++) {
      t += 2 + Math.floor(r() * 20);
      rows.push([t, fwLine(t, "ALLOW", "TCP", VISITORS(r), "10.0.1.10", 49152 + Math.floor(r() * 16e3), r() < 0.8 ? 443 : 80)]);
    }
    const scanner = "192.0.2.61";
    let st = 23 * 3600 + 9 * 60 + 12;
    const ports = [20, 21, 22, 23, 25, 53, 110, 143, 445, 993, 1433, 3306, 3389, 5432, 5900, 8080, 8443, 9e3];
    ports.forEach((p, i) => {
      st += Math.floor(r() * 2);
      rows.push([st, fwLine(st, p === 8443 ? "ALLOW" : "DROP", "TCP", scanner, "10.0.1.10", 51e3 + i, p)]);
    });
    rows.push([st + 30, fwLine(st + 30, "ALLOW", "TCP", scanner, "10.0.1.10", 51040, 443)]);
    rows.sort((a, b) => a[0] - b[0]);
    return { log: rows.map((x) => x[1]), answer: "8443" };
  }
  function bruteLog() {
    const r = rng(707);
    const rows = [];
    const users = ["maya", "leo", "jcarter", "principal", "library", "coach"];
    let t = 23 * 3600 + 30 * 60;
    for (let i = 0; i < 45; i++) {
      t += 10 + Math.floor(r() * 50);
      const u = users[Math.floor(r() * users.length)];
      const ip = `10.0.2.${10 + Math.floor(r() * 60)}`;
      if (r() < 0.22) rows.push([t, `2026-10-06 ${clock(t)} sshd: Failed password for ${u} from ${ip} port ${5e4 + i}`]);
      rows.push([t + 4, `2026-10-06 ${clock(t + 4)} sshd: Accepted password for ${u} from ${ip} port ${5e4 + i}`]);
    }
    const atk = "198.51.100.77";
    let at = 23 * 3600 + 41 * 60 + 3;
    const fails = 37;
    for (let i = 0; i < fails; i++) {
      at += 2 + Math.floor(r() * 3);
      rows.push([at, `2026-10-06 ${clock(at)} sshd: Failed password for admin from ${atk} port ${41e3 + i}`]);
    }
    rows.push([at + 3, `2026-10-06 ${clock(at + 3)} sshd: Accepted password for admin from ${atk} port ${41e3 + fails}`]);
    let b = 23 * 3600 + 52 * 60;
    for (let i = 0; i < 6; i++) {
      b += 5;
      rows.push([b, `2026-10-06 ${clock(b)} sshd: Failed password for root from 192.0.2.140 port ${43e3 + i}`]);
    }
    rows.sort((a, c) => a[0] - c[0]);
    return { log: rows.map((x) => x[1]), answer: String(fails) };
  }
  function slowLog() {
    const r = rng(1111);
    const rows = [];
    let t = 1 * 3600;
    const regulars = ["198.51.100.12", "192.0.2.200", "198.51.100.90", "192.0.2.7"];
    for (let i = 0; i < 260; i++) {
      t += 4 + Math.floor(r() * 36);
      const ip = r() < 0.55 ? regulars[Math.floor(r() * regulars.length)] : VISITORS(r);
      rows.push([t, fwLine(t, "ALLOW", "TCP", ip, "10.0.1.10", 49152 + Math.floor(r() * 16e3), r() < 0.7 ? 443 : 80)]);
    }
    for (let i = 0; i < 18; i++) {
      const at = 3600 + i * 600 + 7;
      rows.push([at, fwLine(at, "ALLOW", "ICMP", "10.0.5.9", "10.0.1.10", "-", "-")]);
    }
    for (let i = 0; i < 10; i++) {
      const at = 3600 + Math.floor(r() * 1e4);
      rows.push([at, fwLine(at, "DROP", "TCP", VISITORS(r), "10.0.1.10", 5e4 + i, [22, 23, 3389, 445][i % 4])]);
    }
    const scanner = "192.0.2.233";
    let st = 3600 + 4 * 60;
    [21, 22, 23, 25, 110, 139, 445, 1433, 3306, 3389, 5432, 5900, 6379, 8080].forEach((p, i) => {
      st += 540 + Math.floor(r() * 240);
      rows.push([st, fwLine(st, "DROP", "TCP", scanner, "10.0.1.10", 33e3 + i * 7, p)]);
      if (i % 4 === 0) rows.push([st + 61, fwLine(st + 61, "ALLOW", "TCP", scanner, "10.0.1.10", 33300 + i, 443)]);
    });
    rows.sort((a, b) => a[0] - b[0]);
    return { log: rows.map((x) => x[1]), answer: scanner };
  }
  var L3 = knockLog();
  var L4 = openDoorLog();
  var L7 = bruteLog();
  var L11 = slowLog();
  var NW_LEVELS = [
    {
      id: "nw1",
      num: 1,
      kind: "rules",
      title: "Lights Out",
      skill: "Default deny",
      passcode: "amber-lantern",
      story: "It is 10 PM. The night firewall has only one rule, and this firewall lets through anything that no rule matches.",
      task: "Only secure web traffic (TCP 443) may reach the web server. Everything else must be blocked. Edit the rules, then press Run.",
      starter: "# Allow secure web traffic to the web server\nallow tcp any -> 10.0.1.10 443\n",
      hints: ['Run it first. Which packets got through that should not? The "rule" column says no rule matched them.', "Add a last line that catches everything:  block any any -> any any"],
      packets: [
        P("Visitor opens the website", "tcp", "198.51.100.7", "10.0.1.10", 443, "allow"),
        P("Another visitor opens the website", "tcp", "192.0.2.30", "10.0.1.10", 443, "allow"),
        P("Stranger tries remote login", "tcp", "198.51.100.7", "10.0.1.10", 22, "block"),
        P("Stranger tries remote desktop", "tcp", "192.0.2.99", "10.0.1.10", 3389, "block"),
        P("Stranger pings the server", "icmp", "198.51.100.9", "10.0.1.10", 0, "block"),
        P("Stranger reaches for a database", "tcp", "192.0.2.8", "10.0.1.20", 3306, "block")
      ]
    },
    {
      id: "nw2",
      num: 2,
      kind: "rules",
      title: "Two Doors and a Phone Book",
      skill: "Ports and protocols",
      passcode: "quiet-harbor",
      maxRules: 4,
      story: "The web server needs both of its doors (80 and 443). The DNS server answers name lookups on UDP port 53.",
      task: "Allow TCP 80 and 443 to the web server and UDP 53 to the DNS server. Block everything else. Use 4 rules or fewer.",
      starter: "# Write your rules here. One rule per line.\n",
      hints: ["One rule can list two ports with a comma:  allow tcp any -> 10.0.1.10 80,443", "DNS uses udp, not tcp. Then finish with  block any any -> any any"],
      packets: [
        P("Visitor opens the website (HTTP)", "tcp", "198.51.100.7", "10.0.1.10", 80, "allow"),
        P("Visitor opens the website (HTTPS)", "tcp", "198.51.100.7", "10.0.1.10", 443, "allow"),
        P("Laptop looks up a name", "udp", "10.0.2.15", "10.0.1.53", 53, "allow"),
        P("Name lookup sent to the web server by mistake", "udp", "10.0.2.15", "10.0.1.10", 53, "block"),
        P("TCP to the DNS server on port 53", "tcp", "192.0.2.44", "10.0.1.53", 53, "block"),
        P("Website request sent to the DNS server", "tcp", "198.51.100.7", "10.0.1.53", 80, "block"),
        P("Stranger tries remote login on the DNS server", "tcp", "192.0.2.99", "10.0.1.53", 22, "block"),
        P("HTTPS to a different server", "tcp", "198.51.100.7", "10.0.1.11", 443, "block")
      ]
    },
    {
      id: "nw3",
      num: 3,
      kind: "log",
      title: "Knock Knock",
      skill: "Reading a firewall log",
      passcode: "copper-falcon",
      story: "Around 10:17 PM someone tried a lot of doors on the web server in just a few seconds. That is a port scan.",
      task: "Find the IP address that scanned the server. Tip: type DROP in the filter box.",
      question: "Which IP address scanned the server?",
      placeholder: "e.g. 192.0.2.1",
      header: FW_HEADER,
      log: L3.log,
      answer: L3.answer,
      hints: ["Filter for DROP. A few addresses were dropped once. One was dropped many times.", "Look for one IP hitting many different ports within the same few seconds."]
    },
    {
      id: "nw4",
      num: 4,
      kind: "log",
      title: "The Open Door",
      skill: "Finding a mistake in the rules",
      passcode: "silver-meadow",
      story: "Another scan, at 11:09 PM. This time one of the doors it tried was open, because someone forgot an old rule.",
      task: "Find the port the scanner reached that is NOT a normal website port.",
      question: "Which port did the scanner find open?",
      placeholder: "a port number",
      header: FW_HEADER,
      log: L4.log,
      answer: L4.answer,
      hints: ["First find the scanner's IP (filter for DROP). Then filter for that IP.", "Among the scanner's lines, look for ALLOW. Ignore 443, which is the normal website."]
    },
    {
      id: "nw5",
      num: 5,
      kind: "rules",
      title: "Bad Neighborhood",
      skill: "Rule order and exceptions",
      passcode: "velvet-compass",
      story: "All of 203.0.113.0/24 is known trouble, so the whole block is banned. But one partner company, 203.0.113.50, needs to reach the website.",
      task: "The rules are right, but in the wrong order. Fix the order so every test passes.",
      starter: "block any 203.0.113.0/24 -> any any\nallow tcp any -> 10.0.1.10 443\nallow tcp 203.0.113.50 -> 10.0.1.10 443\nblock any any -> any any\n",
      hints: ["First match wins. Which rule catches the partner before the partner rule is ever read?", "Move the partner rule to the very top. An exception always goes above the rule it is an exception to."],
      packets: [
        P("Partner opens the website", "tcp", "203.0.113.50", "10.0.1.10", 443, "allow"),
        P("Partner tries remote login", "tcp", "203.0.113.50", "10.0.1.10", 22, "block"),
        P("Bad neighbor opens the website", "tcp", "203.0.113.66", "10.0.1.10", 443, "block"),
        P("Bad neighbor tries HTTP", "tcp", "203.0.113.9", "10.0.1.10", 80, "block"),
        P("Normal visitor opens the website", "tcp", "198.51.100.7", "10.0.1.10", 443, "allow"),
        P("Normal visitor tries remote login", "tcp", "198.51.100.7", "10.0.1.10", 22, "block")
      ]
    },
    {
      id: "nw6",
      num: 6,
      kind: "rules",
      title: "Admins Only",
      skill: "Least privilege with address blocks",
      passcode: "maple-signal",
      maxRules: 4,
      story: "Remote login (SSH, port 22) is how IT fixes servers. Only the admin laptops in 10.0.5.0/24 should ever use it.",
      task: "Anyone may open the website (443 on 10.0.1.10). Admin laptops may SSH to any server in 10.0.1.0/24. Block everything else. 4 rules or fewer.",
      starter: "# Write your rules here.\n",
      hints: ["Address blocks work as source or destination:  allow tcp 10.0.5.0/24 -> 10.0.1.0/24 22", "Three rules are enough: the website rule, the admin SSH rule, and block any any -> any any"],
      packets: [
        P("Admin fixes the web server", "tcp", "10.0.5.20", "10.0.1.10", 22, "allow"),
        P("Admin fixes the DNS server", "tcp", "10.0.5.31", "10.0.1.53", 22, "allow"),
        P("Student tries SSH to the web server", "tcp", "10.0.2.15", "10.0.1.10", 22, "block"),
        P("Stranger tries SSH from the Internet", "tcp", "192.0.2.99", "10.0.1.10", 22, "block"),
        P("Admin tries remote desktop", "tcp", "10.0.5.20", "10.0.1.10", 3389, "block"),
        P("Admin SSH to a student laptop", "tcp", "10.0.5.20", "10.0.2.15", 22, "block"),
        P("Visitor opens the website", "tcp", "198.51.100.7", "10.0.1.10", 443, "allow"),
        P("Student opens the website", "tcp", "10.0.2.15", "10.0.1.10", 443, "allow")
      ]
    },
    {
      id: "nw7",
      num: 7,
      kind: "log",
      title: "Count the Guesses",
      skill: "Spotting password guessing",
      passcode: "cedar-beacon",
      story: "This is the login log for the servers. Students mistype passwords sometimes. But one address kept guessing the admin password until it got in.",
      task: "Count how many times the attacker failed before the successful login.",
      question: "How many failed logins did the attacker make before getting in?",
      placeholder: "a number",
      header: "date       time     message",
      log: L7.log,
      answer: L7.answer,
      hints: ['Filter for "Accepted password for admin". Which IP got in?', 'Now filter for that IP and count the "Failed" lines. The counter under the log helps.']
    },
    {
      id: "nw8",
      num: 8,
      kind: "rules",
      title: "Remember Me",
      skill: "Stateful filtering",
      passcode: "harbor-thistle",
      maxRules: 4,
      story: "Student laptops (10.0.2.0/24) should browse the web. Replies to their requests must come back in. Nobody outside may start a new connection to a laptop.",
      task: "Let laptops start web connections out (TCP 80, 443). Let replies come back in. Block everything else. Add the word established to the end of a rule to match only replies.",
      starter: "# Example of the new word:\n# allow tcp any -> 10.0.2.0/24 any established\n",
      hints: ["Replies come back to a random high port on the laptop, so the reply rule uses port any plus established.", "Three rules: laptops out on 80,443; replies in with established; then block any any -> any any"],
      packets: [
        P("Laptop opens a website (HTTPS)", "tcp", "10.0.2.15", "198.51.100.25", 443, "allow"),
        P("Laptop opens a website (HTTP)", "tcp", "10.0.2.40", "198.51.100.25", 80, "allow"),
        P("The website replies to the laptop", "tcp", "198.51.100.25", "10.0.2.15", 51544, "allow", "est"),
        P("Stranger tries file sharing on a laptop", "tcp", "192.0.2.99", "10.0.2.15", 445, "block"),
        P("Stranger tries remote desktop on a laptop", "tcp", "192.0.2.99", "10.0.2.40", 3389, "block"),
        P('Fake "reply" with no conversation in the table', "tcp", "198.51.100.88", "10.0.2.15", 51544, "block"),
        P("Laptop connects to a chat port used by botnets", "tcp", "10.0.2.15", "192.0.2.50", 6667, "block"),
        P("Stranger pings a laptop", "icmp", "192.0.2.99", "10.0.2.15", 0, "block")
      ]
    },
    {
      id: "nw9",
      num: 9,
      kind: "detect",
      title: "First Alert",
      skill: "Writing a detection rule",
      passcode: "lantern-orchid",
      story: "The IDS watches web traffic to the servers. Someone wrote a rule for SQL injection, but attackers change upper and lower case to slip past it.",
      task: "Make the rule alert on every SQL injection attempt and stay quiet on normal searches.",
      starter: 'alert tcp any any -> $HOME_NET 80 (msg:"SQL injection"; content:"OR 1=1"; sid:1000001;)\n',
      hints: ["Run it. Which attacks were missed? Look at the letters: OR, or, Or.", "Add  nocase;  right after the content so upper and lower case both match."],
      events: [
        E("Classic injection", "GET /search?q=' OR 1=1 --", "alert"),
        E("Lower-case injection", "GET /login?user=admin' or 1=1--", "alert"),
        E("Mixed-case injection", "POST /login user=admin' Or 1=1 #", "alert"),
        E("Normal search", "GET /search?q=library hours", "quiet"),
        E('Normal search with "or"', "GET /search?q=1 or 2 day field trip", "quiet"),
        E("Normal page", "GET /courses/cybr2000", "quiet")
      ]
    },
    {
      id: "nw10",
      num: 10,
      kind: "detect",
      title: "Too Much Noise",
      skill: "Tuning false positives",
      passcode: "willow-cipher",
      story: 'The IDS team is drowning in alerts. This rule fires on anything that says "script", including the drama club and the coding class.',
      task: "Tune the rule: catch every script attack, and zero false alarms.",
      starter: 'alert tcp any any -> $HOME_NET 80 (msg:"Script attack"; content:"script"; nocase; sid:1000002;)\n',
      hints: ["What do all the real attacks have that the normal pages do not? Look right before the word.", 'Change the content to "<script" and keep nocase.'],
      events: [
        E("Attack in a comment", "POST /comment text=<script>steal(cookie)<\/script>", "alert"),
        E("Attack in capitals", "GET /search?q=<SCRIPT SRC=//evil.example/x.js>", "alert"),
        E("Attack in mixed case", "POST /profile bio=<ScRiPt>alert(1)<\/ScRiPt>", "alert"),
        E("Drama club script", "GET /drama/script-for-the-play.pdf", "quiet"),
        E("Coding class page", "GET /cs/javascript-basics.html", "quiet"),
        E("Movie search", "GET /search?q=movie script ideas", "quiet"),
        E("Python lesson", "GET /cs/python-script-homework.py", "quiet")
      ]
    },
    {
      id: "nw11",
      num: 11,
      kind: "log",
      title: "Low and Slow",
      skill: "Finding a hidden pattern",
      passcode: "granite-sparrow",
      story: "Three hours of overnight traffic. A careful attacker is scanning one port every ten minutes so nobody notices. Busy normal visitors make far more noise.",
      task: "Find the slow scanner. Counting lines will fool you. Count different ports instead.",
      question: "Which IP address is scanning slowly?",
      placeholder: "e.g. 192.0.2.1",
      header: FW_HEADER,
      log: L11.log,
      answer: L11.answer,
      hints: ["Filter for DROP. Most dropped addresses appear once. One keeps coming back.", "The scanner also visits port 443 now and then to look normal. Which IP has DROP lines on many different ports?"]
    },
    {
      id: "nw12",
      num: 12,
      kind: "rules",
      title: "Night Shift",
      skill: "The whole firewall",
      passcode: "sentinel-dawn",
      maxRules: 7,
      story: "The night shift chief has called in sick. You write the whole firewall for Byteville tonight.",
      task: "In 7 rules or fewer: (1) nothing at all from 203.0.113.0/24. (2) Anyone may reach the web server on 80 and 443. (3) Anything inside Byteville (10.0.0.0/8) may use DNS: UDP 53 to 10.0.1.53. (4) SSH to servers only from admin laptops. (5) Student laptops may start web connections out on 80 and 443. (6) Replies may come back to student laptops. (7) Block everything else.",
      starter: "# Your firewall. 7 rules or fewer.\n",
      hints: ['Put the bad neighborhood rule first. Otherwise a "reply" from that neighborhood would be let in by your replies rule.', "One rule per requirement, in the same order as the list, works."],
      packets: [
        P("Visitor opens the website (HTTPS)", "tcp", "198.51.100.7", "10.0.1.10", 443, "allow"),
        P("Visitor opens the website (HTTP)", "tcp", "192.0.2.30", "10.0.1.10", 80, "allow"),
        P("Bad neighbor opens the website", "tcp", "203.0.113.66", "10.0.1.10", 443, "block"),
        P("Student laptop looks up a name", "udp", "10.0.2.15", "10.0.1.53", 53, "allow"),
        P("Outsider uses our DNS server", "udp", "198.51.100.7", "10.0.1.53", 53, "block"),
        P("Admin SSH to the DNS server", "tcp", "10.0.5.20", "10.0.1.53", 22, "allow"),
        P("Student tries SSH to the web server", "tcp", "10.0.2.15", "10.0.1.10", 22, "block"),
        P("Outsider tries SSH", "tcp", "192.0.2.99", "10.0.1.10", 22, "block"),
        P("Laptop opens a website", "tcp", "10.0.2.15", "198.51.100.25", 443, "allow"),
        P("Website replies to the laptop", "tcp", "198.51.100.25", "10.0.2.15", 51544, "allow", "est"),
        P("Outsider tries file sharing on a laptop", "tcp", "192.0.2.99", "10.0.2.15", 445, "block"),
        P('"Reply" from the bad neighborhood', "tcp", "203.0.113.9", "10.0.2.15", 51544, "block", "est"),
        P("Laptop sends email straight out (spam bot)", "tcp", "10.0.2.15", "198.51.100.25", 25, "block"),
        P("Outsider pings the web server", "icmp", "198.51.100.9", "10.0.1.10", 0, "block"),
        P("Admin tries remote desktop", "tcp", "10.0.5.20", "10.0.1.10", 3389, "block"),
        P("Laptop SSH to the Internet", "tcp", "10.0.2.15", "198.51.100.25", 22, "block")
      ]
    }
  ];
  var nwBase = (n2) => 40 + n2 * 10;

  // src/nightwatch/screen.ts
  function nightWatchOpen() {
    const c = config();
    return c.nightWatchOpen === true || store.progress.done.length >= CHAPTERS.length;
  }
  function badge(id2) {
    const b = award(id2);
    if (b) {
      sfx.badge();
      toast(`Badge unlocked: <b>${b}</b>`, "badge");
    }
  }
  var nwPoints = () => NW_LEVELS.reduce((a, l) => a + (store.progress.best[l.id] || 0), 0);
  var maxNw = () => NW_LEVELS.reduce((a, l) => a + nwBase(l.num), 0);
  var KIND = { rules: "Firewall rules", log: "Log hunt", detect: "Detection rule" };
  function showNightWatch(app2, go2) {
    const p = store.progress;
    if (!nightWatchOpen()) {
      app2.innerHTML = `<section class="nw"><div class="nw-hero"><p class="eyebrow nw-eye">After graduation</p><h1>Night Watch is locked</h1>
      <p>Night Watch opens after you protect all 8 places in Byteville and graduate. Then the real night shift begins: harder levels, no multiple choice.</p>
      <button class="btn btn-primary" id="nwBack">Back to the town map</button></div></section>`;
      $("#nwBack").addEventListener("click", () => go2("map"));
      return;
    }
    const solved = p.nwSolved.length;
    app2.innerHTML = `<section class="nw">
    <div class="nw-hero">
      <svg class="nw-moon" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30" fill="#FFE7B8"/><circle cx="54" cy="30" r="26" fill="var(--night)"/></svg>
      <p class="eyebrow nw-eye">Advanced \xB7 12 levels</p>
      <h1>Byteville: Night Watch</h1>
      <p class="nw-lead">The town is asleep. You are not. No multiple choice here: you write the firewall rules, read the raw logs, and tune the alarms yourself. Solve a level to get its passcode and unlock the next one.</p>
      <div class="nw-stats"><span><b>${solved}</b>/12 solved</span><span><b>${nwPoints()}</b>/${maxNw()} points</span></div>
    </div>
    <div class="nw-grid">
      <div class="nw-levels">${NW_LEVELS.map((l) => {
      const done = p.nwSolved.includes(l.id);
      const open = l.num <= p.nwUnlocked;
      return `<button class="nw-tile${done ? " done" : ""}${open ? "" : " locked"}" data-l="${l.num}" ${open ? "" : "disabled"}>
          <span class="nw-num">${String(l.num).padStart(2, "0")}</span>
          <span class="nw-title">${esc(l.title)}</span>
          <span class="nw-kind">${KIND[l.kind]} \xB7 ${esc(l.skill)}</span>
          <span class="nw-foot">${done ? `<b>Solved</b> \xB7 ${p.best[l.id]} pts` : open ? `Worth ${nwBase(l.num)} pts` : "Locked"}</span></button>`;
    }).join("")}</div>
      <aside class="nw-side">
        <div class="nw-card"><h3>Have a passcode?</h3><p class="small">On a new computer, type the passcode from your last solved level to jump back in.</p>
          <form id="pcForm" class="pc-row"><label for="pcIn" class="sr">Passcode</label><input id="pcIn" placeholder="word-word" autocomplete="off"><button class="btn btn-small btn-primary">Unlock</button></form>
          <p class="small" id="pcMsg" aria-live="polite"></p></div>
        <div class="nw-card"><h3>Byteville network</h3>${netTable()}</div>
        <div class="nw-card"><h3>Scoring</h3><p class="small">Each level is worth more than the last. Each hint costs a quarter of the level's points. Each wrong try costs 5 points. Only your best score counts.</p></div>
      </aside>
    </div></section>`;
    app2.querySelectorAll(".nw-tile").forEach((b) => b.addEventListener("click", () => playLevel(app2, go2, NW_LEVELS[Number(b.dataset.l) - 1])));
    $("#pcForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#pcIn").value.trim().toLowerCase();
      const lv = NW_LEVELS.find((l) => l.passcode === v);
      const msg = $("#pcMsg");
      if (!lv) {
        msg.textContent = "That passcode is not right. Check the spelling.";
        sfx.wrong();
        return;
      }
      const next = Math.min(NW_LEVELS.length, lv.num + 1);
      if (next > p.nwUnlocked) {
        p.nwUnlocked = next;
        persist();
      }
      sfx.right();
      showNightWatch(app2, go2);
      toast(`Unlocked up to level ${next}.`);
    });
  }
  function netTable() {
    return `<table class="net">${NETWORK.map(([a, d]) => `<tr><td class="mono">${a}</td><td>${esc(d)}</td></tr>`).join("")}</table>`;
  }
  var FW_HELP = `<pre class="syntax">allow|block  proto  source -> destination  port  [established]</pre>
<ul class="small tight"><li><b>proto</b>: tcp, udp, icmp, or any</li><li><b>source, destination</b>: any, an IP, or a block like 10.0.2.0/24</li>
<li><b>port</b>: any, 443, or 80,443</li><li><b>established</b> (optional): match only replies</li><li>Read top to bottom. <b>First match wins.</b></li><li>Lines starting with # are notes.</li></ul>`;
  var IDS_HELP = `<pre class="syntax">alert tcp any any -> $HOME_NET 80 (msg:"..."; content:"..."; nocase; sid:1000001;)</pre>
<ul class="small tight"><li><b>content</b>: text that must appear in the traffic</li><li><b>nocase</b>: ignore upper and lower case for the content before it</li>
<li>More than one content: all of them must appear</li><li><b>$HOME_NET</b> means our servers, 10.0.1.0/24</li></ul>`;
  function playLevel(app2, go2, lv) {
    const p = store.progress;
    let tries = 0;
    let hints = p.nwHints[lv.id] || 0;
    let solved = false;
    let t0 = performance.now();
    const started = Date.now();
    const body = lv.kind === "log" ? logBody(lv) : `
    <label class="nw-label" for="ed">${lv.kind === "rules" ? "Your firewall rules" : "Your detection rule"}${lv.kind === "rules" && lv.maxRules ? ` <span class="muted">(max ${lv.maxRules} rules)</span>` : ""}</label>
    <textarea id="ed" class="editor" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${lv.kind === "rules" ? 9 : 5}">${esc(lv.starter)}</textarea>
    <div class="row-gap"><button class="btn btn-primary" id="run">Run tests</button><button class="btn btn-small btn-ghost" id="reset">Reset to start</button></div>`;
    app2.innerHTML = `<section class="nw nw-play">
    <div class="nw-bar"><button class="btn btn-small" id="back">&larr; Night Watch</button>
      <div><small>Level ${lv.num} \xB7 ${KIND[lv.kind]}</small><b>${esc(lv.title)}</b></div><span class="nw-worth">Worth <b id="worth">${worth()}</b> pts</span></div>
    <div class="nw-mission"><p>${esc(lv.story)}</p>${taskHtml(lv.task)}</div>
    <div class="nw-work">
      <div class="nw-main">${body}<div id="msg" class="nw-msg" aria-live="polite"></div><div id="results"></div></div>
      <aside class="nw-side">
        ${lv.kind !== "log" ? `<div class="nw-card"><h3>How to write it</h3>${lv.kind === "rules" ? FW_HELP : IDS_HELP}</div>` : ""}
        <div class="nw-card"><h3>Hints</h3><div id="hints">${hintHtml()}</div></div>
        <div class="nw-card"><h3>Network</h3>${netTable()}</div>
      </aside>
    </div></section>`;
    function worth() {
      const b = nwBase(lv.num);
      return Math.max(Math.round(b * 0.25), Math.round(b * (1 - 0.25 * hints)) - 5 * tries);
    }
    function hintHtml() {
      return lv.hints.map((h, i) => i < hints ? `<p class="hint-open"><b>Hint ${i + 1}:</b> ${esc(h)}</p>` : "").join("") + (hints < 2 && !solved ? `<button class="btn btn-small" id="hintBtn">Show hint ${hints + 1} (costs ${Math.round(nwBase(lv.num) * 0.25)} pts)</button>` : "");
    }
    function wireHint() {
      const b = document.getElementById("hintBtn");
      if (b) b.addEventListener("click", () => {
        hints++;
        p.nwHints[lv.id] = Math.max(p.nwHints[lv.id] || 0, hints);
        persist();
        track({ event: "answer", chapter: "nw", item_id: `${lv.id}-hint${hints}`, prompt: `${lv.title}: opened hint ${hints}`, choice: "hint", correct: "", points: 0 });
        $("#hints").innerHTML = hintHtml();
        $("#worth").textContent = String(worth());
        wireHint();
      });
    }
    wireHint();
    $("#back").addEventListener("click", () => showNightWatch(app2, go2));
    const msg = $("#msg");
    const say = (html, kind) => {
      msg.className = "nw-msg " + kind;
      msg.innerHTML = html;
    };
    function submit(submission, ok) {
      const ms = Math.round(performance.now() - t0);
      t0 = performance.now();
      if (!ok) {
        tries++;
        $("#worth").textContent = String(worth());
        sfx.wrong();
        track({ event: "answer", chapter: "nw", item_id: lv.id, prompt: lv.title, choice: submission.slice(0, 280), correct: 0, time_ms: ms, points: 0 });
        return;
      }
      solved = true;
      const pts = worth();
      const prev = p.best[lv.id] || 0;
      p.best[lv.id] = Math.max(prev, pts);
      p.points = Object.values(p.best).reduce((a, b) => a + b, 0);
      if (!p.nwSolved.includes(lv.id)) p.nwSolved.push(lv.id);
      p.nwUnlocked = Math.max(p.nwUnlocked, Math.min(NW_LEVELS.length, lv.num + 1));
      p.playMs += Date.now() - started;
      persist();
      track({ event: "answer", chapter: "nw", item_id: lv.id, prompt: lv.title, choice: submission.slice(0, 280), correct: 1, time_ms: ms, points: pts });
      track({ event: "chapter_complete", chapter: lv.id, item_id: `${lv.id}-done`, prompt: `Night Watch ${lv.num}: ${lv.title}`, choice: `${hints} hints`, correct: tries, time_ms: Date.now() - started, points: pts, total_points: p.points });
      void flush();
      badge("nw-first");
      if (p.nwSolved.length >= 6) badge("nw-half");
      if (lv.num >= 7 && hints === 0) badge("nw-clean");
      const all = p.nwSolved.length === NW_LEVELS.length;
      if (all) badge("nw-all");
      sfx.win();
      confetti();
      const next = NW_LEVELS[lv.num];
      modal(
        `<p class="eyebrow">Level ${lv.num} solved</p><h3>${esc(lv.title)}: cleared!</h3>
      <p><b>+${pts} points</b>${prev && pts <= prev ? ` (your best is still ${prev})` : ""}. ${tries ? `${tries} wrong ${tries === 1 ? "try" : "tries"}` : "First try"}${hints ? `, ${hints} hint${hints > 1 ? "s" : ""}` : ", no hints"}.</p>
      <div class="passcode">Passcode for the next level: <b>${lv.passcode}</b></div>
      <p class="small muted">Write it down. It unlocks level ${Math.min(12, lv.num + 1)} on any computer.</p>${all ? "<p><b>You solved all 12. You are a Byteville Sentinel.</b></p>" : ""}`,
        next ? [{ label: `Next: ${next.title}`, primary: true, onClick: () => playLevel(app2, go2, next) }, { label: "Night Watch", onClick: () => showNightWatch(app2, go2) }] : [{ label: "Back to Night Watch", primary: true, onClick: () => showNightWatch(app2, go2) }]
      );
    }
    if (lv.kind === "rules" || lv.kind === "detect") {
      const ed = $("#ed");
      $("#reset").addEventListener("click", () => {
        ed.value = lv.starter;
        say("", "info");
        $("#results").innerHTML = "";
      });
      ed.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          $("#run").click();
        }
      });
      $("#run").addEventListener("click", () => {
        if (solved) return;
        if (lv.kind === "rules") runRules(lv, ed.value);
        else runDetect(lv, ed.value);
      });
    } else {
      wireLog(lv);
    }
    function runRules(L, src) {
      const { rules, errors } = parseFirewall(src);
      if (errors.length) {
        say(`<b>Fix this first:</b><br>${errors.map(esc).join("<br>")}`, "no");
        $("#results").innerHTML = "";
        return;
      }
      if (!rules.length) {
        say("Write at least one rule.", "no");
        return;
      }
      const res = L.packets.map((pk) => ({ pk, ...fwDecide(rules, pk) }));
      const right = res.filter((r) => r.got === r.pk.want).length;
      const tooMany = L.maxRules !== void 0 && rules.length > L.maxRules;
      $("#results").innerHTML = `<div class="tw"><table class="res"><thead><tr><th>Test packet</th><th>Traffic</th><th>Should</th><th>Got</th><th>Rule</th></tr></thead><tbody>
      ${res.map((r) => `<tr class="${r.got === r.pk.want ? "pass" : "fail"}"><td>${esc(r.pk.label)}</td>
        <td class="mono small">${r.pk.proto.toUpperCase()} ${r.pk.src} &rarr; ${r.pk.dst}${r.pk.proto === "icmp" ? "" : ":" + r.pk.port}${r.pk.state === "est" ? ' <span class="tag">reply</span>' : ""}</td>
        <td>${r.pk.want}</td><td><b>${r.got}</b></td><td>${r.by >= 0 ? `#${r.by + 1}` : '<span class="muted">none</span>'}</td></tr>`).join("")}</tbody></table></div>`;
      const ok = right === res.length && !tooMany;
      if (ok) say(`<b>All ${res.length} packets handled correctly.</b>`, "ok");
      else if (right === res.length && tooMany) say(`Every packet is right, but you used ${rules.length} rules. The limit is ${L.maxRules}. Combine some.`, "no");
      else say(`<b>${right} of ${res.length}</b> packets handled correctly. Look at the red rows: which rule decided them?`, "no");
      submit(src, ok);
    }
    function runDetect(L, src) {
      const { rules, errors } = parseIds(src);
      if (errors.length) {
        say(`<b>Fix this first:</b><br>${errors.map(esc).join("<br>")}`, "no");
        $("#results").innerHTML = "";
        return;
      }
      if (!rules.length) {
        say("Write at least one rule.", "no");
        return;
      }
      const res = L.events.map((ev) => ({ ev, ...idsDecide(rules, ev) }));
      const missed = res.filter((r) => r.ev.want === "alert" && r.got === "quiet").length;
      const noisy = res.filter((r) => r.ev.want === "quiet" && r.got === "alert").length;
      $("#results").innerHTML = `<div class="tw"><table class="res"><thead><tr><th>Traffic to the web server</th><th>Should</th><th>Got</th></tr></thead><tbody>
      ${res.map((r) => `<tr class="${r.got === r.ev.want ? "pass" : "fail"}"><td><span class="small muted">${esc(r.ev.label)}</span><br><span class="mono small">${esc(r.ev.payload)}</span></td><td>${r.ev.want}</td><td><b>${r.got}</b></td></tr>`).join("")}</tbody></table></div>`;
      const ok = missed === 0 && noisy === 0;
      if (ok) say("<b>Every attack caught, zero false alarms.</b>", "ok");
      else say(`${missed ? `<b>${missed} missed attack${missed > 1 ? "s" : ""}</b> (false negatives). ` : ""}${noisy ? `<b>${noisy} false alarm${noisy > 1 ? "s" : ""}</b> (false positives).` : ""}`, "no");
      submit(src, ok);
    }
    function wireLog(L) {
      const view = $("#logView");
      const count = $("#logCount");
      const draw = (q) => {
        const needle = q.trim().toLowerCase();
        const lines = needle ? L.log.filter((l) => l.toLowerCase().includes(needle)) : L.log;
        view.textContent = lines.join("\n") || "(no lines match)";
        count.textContent = `Showing ${lines.length} of ${L.log.length} lines`;
      };
      draw("");
      const f = $("#logFilter");
      f.addEventListener("input", () => draw(f.value));
      $("#ansForm").addEventListener("submit", (e) => {
        e.preventDefault();
        if (solved) return;
        const v = $("#ans").value.trim().toLowerCase().replace(/\s+/g, "");
        if (!v) return;
        const ok = v === L.answer.toLowerCase();
        if (ok) say(`<b>Correct: ${esc(L.answer)}.</b>`, "ok");
        else say(`<b>"${esc(v)}" is not it.</b> Look again. Each wrong try costs 5 points.`, "no");
        submit(v, ok);
      });
    }
  }
  function taskHtml(task) {
    const parts = task.split(/\s*\(\d+\)\s*/);
    if (parts.length < 3) return `<p class="nw-task"><b>Your task:</b> ${esc(task)}</p>`;
    return `<p class="nw-task"><b>Your task:</b> ${esc(parts[0])}</p><ol class="nw-list">${parts.slice(1).map((x) => `<li>${esc(x.replace(/\.$/, ""))}</li>`).join("")}</ol>`;
  }
  function logBody(L) {
    return `<div class="log-tools"><label for="logFilter" class="nw-label">Filter (shows only lines that contain this text)</label>
    <input id="logFilter" class="log-filter" placeholder="try: DROP" autocomplete="off" spellcheck="false"></div>
    <div class="log-box"><div class="log-head mono">${esc(L.header)}</div><pre id="logView" class="log-view" tabindex="0"></pre></div>
    <p class="small muted" id="logCount"></p>
    <form id="ansForm" class="ans-row"><label for="ans" class="nw-label">${esc(L.question)}</label>
      <div class="pc-row"><input id="ans" placeholder="${esc(L.placeholder)}" autocomplete="off" spellcheck="false"><button class="btn btn-primary">Check answer</button></div></form>`;
  }

  // src/main.ts
  var app = $("#app");
  function renderHeader(active) {
    const prof = store.profile;
    const p = store.progress;
    const r = rankFor(p.points);
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.go === active));
    $("#navPlayer").innerHTML = prof ? `<button class="player-pill" data-go="profile" aria-label="Your profile">${avatar(prof.avatar, 34)}
    <span><b>${esc(prof.name)}</b><small>${r.name} \xB7 <span class="pts-num">${p.points}</span> pts</small></span></button>` : "";
    const pill = $("#navPlayer .player-pill");
    if (pill) pill.addEventListener("click", () => go("profile"));
  }
  function go(route) {
    if (!store.profile && route !== "help") route = "welcome";
    window.scrollTo(0, 0);
    switch (route) {
      case "map":
        return showMap();
      case "badges":
        return showBadges();
      case "help":
        return showHelp();
      case "profile":
        return showProfile();
      case "grad":
        return showGrad();
      case "nightwatch":
        renderHeader("nightwatch");
        return showNightWatch(app, go);
      default:
        return showWelcome();
    }
  }
  (() => {
    const nav = document.querySelector(".nav");
    if (nav && !nav.querySelector('[data-go="nightwatch"]')) {
      const a = document.createElement("a");
      a.href = "#";
      a.dataset.go = "nightwatch";
      a.textContent = "Night Watch";
      a.className = "nav-night";
      nav.insertBefore(a, nav.querySelector('[data-go="help"]'));
    }
  })();
  document.querySelectorAll("[data-go]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    go(a.dataset.go || "map");
  }));
  function showWelcome() {
    renderHeader("");
    let pickAv = 0;
    app.innerHTML = `
  <section class="welcome">
    <div class="welcome-copy">
      <p class="eyebrow">A cybersecurity training camp</p>
      <h1>Byteville needs <span class="hl">defenders.</span></h1>
      <p class="lead">Hackers are knocking on the town's doors. In about 45 minutes, Officer Ada will train you to spot tricks, choose strong locks, guard the city gate, and catch attacks hidden in plain sight.</p>
      <ul class="welcome-list">
        <li><b>8 chapters</b> on one town map</li><li><b>Points, ranks, and 14 badges</b></li><li><b>A certificate</b> when you graduate</li>
      </ul>
      <div class="town-art">${art("town")}</div>
    </div>
    <form class="signup card" id="signup" autocomplete="off">
      <div class="ada-line">${ada(56)}<p><b>Officer Ada:</b> Hi! I am the town's security chief. Tell me who you are and we will get started.</p></div>
      <label for="fName">Your first name and last initial</label>
      <input id="fName" maxlength="30" placeholder="Maya R." required>
      <label for="fClass">Class code <span class="muted">(from your teacher)</span></label>
      <input id="fClass" maxlength="20" placeholder="CYBR-2000" value="${esc(config().defaultClassCode || "")}">
      <span class="label">Pick your avatar</span>
      <div class="avatars" role="radiogroup" aria-label="Avatar">${[0, 1, 2, 3, 4, 5].map((i) => `<button type="button" class="av${i === 0 ? " on" : ""}" role="radio" aria-checked="${i === 0}" data-i="${i}">${avatar(i, 48)}</button>`).join("")}</div>
      <button class="btn btn-primary btn-big" type="submit">Start training</button>
      <p class="small muted">${trackingOn() ? "Your teacher will see your answers and scores so they can help you learn. Use only your first name and last initial." : "Your progress is saved in this browser only."}</p>
    </form>
  </section>`;
    app.querySelectorAll(".av").forEach((b) => b.addEventListener("click", () => {
      pickAv = Number(b.dataset.i);
      app.querySelectorAll(".av").forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-checked", String(x === b));
      });
    }));
    $("#signup").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#fName").value.trim().slice(0, 30);
      if (!name) return;
      store.profile = { name, classCode: $("#fClass").value.trim().toUpperCase().slice(0, 20), avatar: pickAv, sessionId: newSessionId(), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      persist();
      track({ event: "start", choice: `avatar ${pickAv}` });
      sfx.badge();
      go("map");
    });
  }
  function nextChapter() {
    return CHAPTERS.find((c) => !store.progress.done.includes(c.id));
  }
  function stars(n2) {
    return `<span class="stars" aria-label="${n2} of 3 stars">${[0, 1, 2].map((i) => `<svg viewBox="0 0 24 24" class="${i < n2 ? "on" : ""}"><path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>`).join("")}</span>`;
  }
  function showMap() {
    renderHeader("map");
    const p = store.progress;
    const nx = nextChapter();
    const r = rankFor(p.points);
    const toNext = r.next ? Math.round((p.points - r.floor) / (r.next - r.floor) * 100) : 100;
    const first = store.profile.name.split(" ")[0];
    const greet = p.done.length === 0 ? `Welcome, ${esc(first)}! Start at the Town Hall. Click it on the map.` : nx ? `Nice work, ${esc(first)}. Next stop: <b>${nx.place}</b>.` : `You did it, ${esc(first)}! Visit Graduation for your certificate.`;
    app.innerHTML = `
  <section class="map-top">
    <div class="ada-bubble">${ada(64)}<div class="bubble"><p>${greet}</p></div></div>
    <div class="map-stats">
      <div class="stat"><b>${p.points}</b><span>points</span></div>
      <div class="stat"><b>${totalStars()}<small>/${maxStars()}</small></b><span>stars</span></div>
      <div class="stat"><b>${p.badges.length}<small>/${BADGES.length}</small></b><span>badges</span></div>
      <div class="stat rank"><b>${r.name}</b><span>${r.next ? `${r.next - p.points} pts to next rank` : "Top rank!"}</span><div class="meter"><i style="width:${toNext}%"></i></div></div>
    </div>
  </section>
  <section class="town">
    <div class="town-head"><h2>Town map</h2><p class="muted">${p.done.length} of ${CHAPTERS.length} places protected</p></div>
    <div class="town-board">${CHAPTERS.map((c, i) => {
      const open = i + 1 <= p.unlocked;
      const done = p.done.includes(c.id);
      const isNext = nx && nx.id === c.id;
      return `<button class="lot${open ? "" : " locked"}${isNext ? " next" : ""}${done ? " done" : ""}" data-ch="${c.id}" ${open ? "" : "disabled"} style="--c:${c.color}">
        <span class="lot-num">${c.num}</span>
        <span class="lot-art">${building(c)}</span>
        <span class="lot-name">${c.place}</span>
        <span class="lot-topic">${c.topic}</span>
        <span class="lot-foot">${open ? done ? stars(p.stars[c.id] || 0) : `<span class="mins">${c.minutes} min</span>` : '<span class="mins">Locked</span>'}${isNext ? '<span class="go-tag">Go here</span>' : ""}</span>
      </button>`;
    }).join("")}
      <button class="lot grad${p.done.length === CHAPTERS.length ? " next" : " locked"}" data-go-grad ${p.done.length === CHAPTERS.length ? "" : "disabled"}>
        <span class="lot-name">Graduation</span><span class="lot-topic">${p.done.length === CHAPTERS.length ? "Get your certificate" : "Finish all 8 places to unlock"}</span></button>
      <button class="lot night${nightWatchOpen() ? "" : " locked"}" data-go-nw ${nightWatchOpen() ? "" : "disabled"}>
        <span class="lot-name">Night Watch</span><span class="lot-topic">${nightWatchOpen() ? `Advanced: 12 hard levels \xB7 ${p.nwSolved.length}/12 solved` : "Advanced levels. Unlocks after graduation"}</span></button>
    </div>
  </section>
  <section class="map-side">
    <div class="card"><h3>Latest badges</h3><div class="badge-row">${p.badges.length ? p.badges.slice(-4).map((id2) => badgeChip(id2, true)).join("") : '<p class="muted small">Finish the Town Hall to earn your first badge.</p>'}</div>
      <a href="#" class="link" data-go="badges">See all badges</a></div>
    <div class="card" id="lbCard"><h3>Class leaderboard</h3><p class="muted small">${trackingOn() ? "Loading..." : "The leaderboard appears when your teacher turns on class tracking."}</p></div>
  </section>`;
    app.querySelectorAll(".lot[data-ch]").forEach((b) => b.addEventListener("click", () => startChapter(CHAPTERS.find((c) => c.id === b.dataset.ch))));
    const g = app.querySelector("[data-go-grad]");
    if (g) g.addEventListener("click", () => go("grad"));
    const nwb = app.querySelector("[data-go-nw]");
    if (nwb) nwb.addEventListener("click", () => go("nightwatch"));
    app.querySelectorAll("a[data-go]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      go(a.dataset.go);
    }));
    if (trackingOn()) {
      void flush().then(() => leaderboard(store.profile.classCode)).then((rows) => {
        const card = $("#lbCard");
        if (!card) return;
        if (!rows) {
          card.innerHTML = '<h3>Class leaderboard</h3><p class="muted small">Not available right now.</p>';
          return;
        }
        card.innerHTML = `<h3>Class leaderboard</h3>${rows.length ? `<ol class="lb">${rows.slice(0, 8).map((r2) => `<li class="${r2.student === store.profile.name ? "me" : ""}"><span>${esc(r2.student)}</span><b>${r2.points}</b></li>`).join("")}</ol>` : '<p class="muted small">No scores yet. Be the first!</p>'}`;
      });
    }
  }
  function badgeChip(id2, on) {
    const b = BADGES.find((x) => x.id === id2);
    return `<div class="badge ${on ? "on" : ""}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2l5 4 6-1 2 6 5 4-2 6 2 6-5 4-2 6-6-1-5 4-5-4-6 1-2-6-5-4 2-6-2-6 5-4 2-6 6 1z" class="b-seal"/><path d="M13 20l5 5 9-10" class="b-check"/></svg><span><b>${b.name}</b><small>${b.how}</small></span></div>`;
  }
  var run = null;
  function giveBadge(id2) {
    const b = award(id2);
    if (b) {
      sfx.badge();
      toast(`Badge unlocked: <b>${b}</b>`, "badge");
    }
  }
  function answer(a) {
    var _a;
    const p = store.progress;
    if (!run) return 0;
    run.answered++;
    p.answered++;
    let pts = 0;
    if (a.correct) {
      run.correct++;
      p.correct++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      const mult = 1 + Math.min(2, Math.floor(p.streak / 3) * 0.5);
      pts = Math.round(((_a = a.base) != null ? _a : 10) * mult) + (a.bonus || 0);
      if (p.streak === 5) giveBadge("streak5");
      if (p.streak === 10) giveBadge("streak10");
      if (p.streak > 0 && p.streak % 5 === 0) toast(`${p.streak} in a row! Points x${mult}`);
    } else {
      p.streak = 0;
    }
    run.points += pts;
    persist();
    updateRunBar();
    track({
      event: a.itemId.endsWith("-check") ? "check" : "answer",
      chapter: run.ch.id,
      item_id: a.itemId,
      prompt: a.prompt,
      choice: a.choice,
      correct_answer: a.correctAnswer,
      correct: a.correct ? 1 : 0,
      time_ms: Math.round(a.timeMs),
      points: pts,
      total_points: p.points + run.points
    });
    return pts;
  }
  function updateRunBar() {
    const bar = document.querySelector(".run-bar");
    if (!bar || !run) return;
    bar.querySelector(".rb-pts").textContent = String(run.points);
    bar.querySelector(".rb-streak").textContent = String(store.progress.streak);
  }
  function chapterShell(ch, stepLabel, stepIdx, steps) {
    app.innerHTML = `
  <div class="run-bar" style="--c:${ch.color}">
    <button class="btn btn-small btn-ghost" id="leave">&larr; Map</button>
    <div class="rb-title"><small>Chapter ${ch.num} \xB7 ${ch.place}</small><b>${esc(stepLabel)}</b></div>
    <div class="rb-steps" aria-hidden="true">${Array.from({ length: steps }, (_, i) => `<i class="${i < stepIdx ? "done" : i === stepIdx ? "now" : ""}"></i>`).join("")}</div>
    <div class="rb-score"><span><small>Points</small><b class="rb-pts">${run ? run.points : 0}</b></span><span><small>Streak</small><b class="rb-streak">${store.progress.streak}</b></span></div>
  </div>
  <section class="stage" id="stage"></section>`;
    $("#leave").addEventListener("click", () => {
      modal("<h3>Leave this chapter?</h3><p>Your points in this chapter will not be saved until you finish it.</p>", [
        { label: "Keep playing", primary: true, onClick: () => void 0 },
        { label: "Go to the map", onClick: () => {
          run = null;
          go("map");
        } }
      ]);
    });
    return $("#stage");
  }
  function startChapter(ch) {
    run = { ch, points: 0, answered: 0, correct: 0, started: Date.now(), read: /* @__PURE__ */ new Set() };
    renderHeader("map");
    const steps = ch.lessons.length + 1 + ch.stages.length;
    let lesson = 0;
    const showLesson = () => {
      const L = ch.lessons[lesson];
      const t0 = Date.now();
      const st = chapterShell(ch, `Lesson ${lesson + 1} of ${ch.lessons.length}`, lesson, steps);
      st.innerHTML = `
    <article class="lesson">
      <div class="lesson-text">
        <p class="eyebrow">${esc(ch.topic)}</p>
        <h1>${esc(L.title)}</h1>
        <div class="ada-line small-ada">${ada(44)}<span>Officer Ada explains</span></div>
        ${L.body.map((b) => `<p>${b}</p>`).join("")}
        ${L.fact ? `<div class="fact"><b>Did you know?</b> ${L.fact}</div>` : ""}
      </div>
      <figure class="lesson-art">${L.art ? art(L.art) : ""}</figure>
    </article>
    <div class="lesson-nav">
      <button class="btn" id="back" ${lesson === 0 ? "disabled" : ""}>Back</button>
      <span class="muted small">Reading earns 5 points</span>
      <button class="btn btn-primary" id="next">${lesson === ch.lessons.length - 1 ? "Quick check" : "Next"}</button>
    </div>`;
      $("#back").addEventListener("click", () => {
        lesson--;
        showLesson();
      });
      $("#next").addEventListener("click", () => {
        const secs = Date.now() - t0;
        track({ event: "lesson", chapter: ch.id, item_id: `${ch.id}-l${lesson + 1}`, prompt: L.title, time_ms: secs, points: 5 });
        if (run && !run.read.has(lesson)) {
          run.read.add(lesson);
          run.points += 5;
        }
        lesson++;
        lesson < ch.lessons.length ? showLesson() : showCheck();
      });
      $("#next").focus();
    };
    const showCheck = () => {
      const st = chapterShell(ch, "Quick check", ch.lessons.length, steps);
      st.innerHTML = `<div class="check card"><div class="ada-line">${ada(52)}<p><b>Quick check!</b> One question to make sure the idea stuck.</p></div><div class="q-box"></div></div>`;
      askOne(
        $(".q-box", st),
        ch.check,
        "list",
        (i, ok, ms) => answer({ itemId: ch.check.id, prompt: ch.check.prompt, choice: ch.check.options[i], correctAnswer: ch.check.options[ch.check.answer], correct: ok, timeMs: ms }),
        () => {
          if (run && run.ch === ch && document.body.contains(st)) runStage(0);
        }
      );
    };
    const runStage = (s) => {
      if (s >= ch.stages.length) return finishChapter(ch);
      const stage = ch.stages[s];
      const st = chapterShell(ch, stage.title, ch.lessons.length + 1 + s, steps);
      const myRun = run;
      let finished = false;
      const ctx = {
        answer: (a) => run === myRun ? answer(a) : 0,
        done: () => {
          if (finished || run !== myRun) return;
          finished = true;
          runStage(s + 1);
        },
        chapter: ch
      };
      if (stage.type === "sort") runSort(st, stage, ctx);
      else if (stage.type === "choice") runChoice(st, stage, ctx);
      else if (stage.type === "inbox") runInbox(st, stage, ctx);
      else if (stage.type === "lane") runLane(st, stage, ctx);
      else runOrder(st, stage, ctx);
    };
    showLesson();
  }
  function finishChapter(ch) {
    if (!run) return;
    const p = store.progress;
    const acc = run.answered ? run.correct / run.answered : 1;
    const st = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    const firstTime = !p.done.includes(ch.id);
    let bonus = 25 + (st === 3 ? 25 : 0);
    run.points += bonus;
    const prevBest = p.best[ch.id] || 0;
    const newBest = Math.max(prevBest, run.points);
    p.best[ch.id] = newBest;
    p.points = Object.values(p.best).reduce((a, b) => a + b, 0);
    p.stars[ch.id] = Math.max(p.stars[ch.id] || 0, st);
    p.playMs += Date.now() - run.started;
    if (firstTime) p.done.push(ch.id);
    p.unlocked = Math.max(p.unlocked, Math.min(CHAPTERS.length, ch.num + 1));
    persist();
    giveBadge("ch-" + ch.id);
    if (Object.values(p.stars).filter((x) => x === 3).length >= 3) giveBadge("perfect");
    const allDone = p.done.length === CHAPTERS.length;
    if (allDone) giveBadge("grad");
    track({
      event: "chapter_complete",
      chapter: ch.id,
      item_id: ch.id + "-done",
      prompt: ch.place,
      choice: `${st} stars`,
      correct_answer: "",
      correct: Math.round(acc * 100),
      time_ms: Date.now() - run.started,
      points: run.points,
      total_points: p.points
    });
    if (allDone && firstTime) track({ event: "finish", points: 0, total_points: p.points });
    void flush();
    sfx.win();
    confetti();
    const nx = CHAPTERS[ch.num];
    const r = rankFor(p.points);
    const improved = newBest > prevBest && prevBest > 0;
    const runPts = run.points;
    run = null;
    renderHeader("map");
    app.innerHTML = `
  <section class="results card">
    <p class="eyebrow">Chapter ${ch.num} complete</p>
    <h1>${ch.place} is protected!</h1>
    <div class="res-stars">${stars(st)}</div>
    <div class="res-grid">
      <div><b>${runPts}</b><span>points this run</span></div>
      <div><b>${Math.round(acc * 100)}%</b><span>correct</span></div>
      <div><b>${p.bestStreak}</b><span>best streak</span></div>
      <div><b>${r.name}</b><span>your rank</span></div>
    </div>
    ${prevBest && !improved ? `<p class="muted small">Your best for this chapter is still ${prevBest}. Only your best run counts toward your total.</p>` : ""}
    ${improved ? `<p class="small"><b>New best!</b> Your total went up.</p>` : ""}
    <div class="ada-line">${ada(56)}<p><b>Officer Ada:</b> ${esc(ch.outro)} ${st < 3 ? "Replay any time to earn 3 stars." : ""}</p></div>
    <div class="row-gap center">
      ${allDone ? '<button class="btn btn-primary btn-big" id="toGrad">Go to Graduation</button>' : nx ? `<button class="btn btn-primary btn-big" id="toNext">Next: ${nx.place}</button>` : ""}
      <button class="btn" id="toMap">Town map</button>
      <button class="btn" id="again">Replay</button>
    </div>
  </section>`;
    const tn = document.getElementById("toNext");
    if (tn && nx) tn.addEventListener("click", () => startChapter(nx));
    const tg = document.getElementById("toGrad");
    if (tg) tg.addEventListener("click", () => go("grad"));
    $("#toMap").addEventListener("click", () => go("map"));
    $("#again").addEventListener("click", () => startChapter(ch));
  }
  function showBadges() {
    renderHeader("badges");
    const have = store.progress.badges;
    app.innerHTML = `<section class="page"><p class="eyebrow">Collection</p><h1>Badges</h1><p class="lead">${have.length} of ${BADGES.length} earned. Each badge shows what you need to do.</p>
    <div class="badge-grid">${BADGES.map((b) => badgeChip(b.id, have.includes(b.id))).join("")}</div></section>`;
  }
  function showHelp() {
    renderHeader("help");
    app.innerHTML = `<section class="page narrow"><p class="eyebrow">Guide</p><h1>How to play</h1>
    <div class="ada-line">${ada(56)}<p><b>Officer Ada:</b> Each place on the town map is a chapter. I teach a short lesson, you answer a quick check, then you play a challenge.</p></div>
    <h2>Points</h2><ul class="clean">
      <li><b>10 points</b> for each right answer. Reading each lesson gives 5 points.</li>
      <li><b>Streaks</b> multiply your points: 3 in a row is x1.5, 6 in a row is x2, 9 in a row is x3.</li>
      <li><b>Speed bonus</b> at the gate when you decide quickly. <b>Gold packets</b> give 30 extra.</li>
      <li><b>Finish bonus:</b> 25 for every chapter, plus 25 more for 3 stars.</li>
      <li>Replaying a chapter only counts if you beat your best score.</li></ul>
    <h2>Stars</h2><p>3 stars for 90% right or better. 2 stars for 70% or better. 1 star for finishing.</p>
    <h2>Night Watch</h2><p>After graduation, Night Watch opens 12 advanced levels. You write firewall rules, hunt through logs, and tune detection rules. Each solved level gives a passcode that unlocks the next one on any computer.</p>
    <h2>Ranks</h2><p>Rookie, Cadet, Gate Guard, Analyst, Defender, and Chief of Security.</p>
    <h2>Keyboard</h2><p>In sorting games press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>. At the gate press <kbd>A</kbd> to allow and <kbd>B</kbd> to block.</p>
    <h2>What gets saved?</h2><p>${trackingOn() ? "Your name, class code, answers, scores, and how long each step took are sent to your teacher's private spreadsheet. Nothing else." : "Your progress stays in this browser. Nothing is sent anywhere."}</p></section>`;
  }
  function showProfile() {
    renderHeader("profile");
    const prof = store.profile;
    const p = store.progress;
    const acc = p.answered ? Math.round(p.correct / p.answered * 100) : 0;
    app.innerHTML = `<section class="page"><div class="profile-head">${avatar(prof.avatar, 72)}<div><p class="eyebrow">Player</p><h1>${esc(prof.name)}</h1><p class="muted">${prof.classCode ? "Class " + esc(prof.classCode) + " \xB7 " : ""}${rankFor(p.points).name}</p></div></div>
    <div class="res-grid">
      <div><b>${p.points}</b><span>total points</span></div><div><b>${acc}%</b><span>answers right</span></div>
      <div><b>${p.bestStreak}</b><span>best streak</span></div><div><b>${Math.round(p.playMs / 6e4)} min</b><span>time played</span></div></div>
    <div class="row-gap">
      <button class="btn" id="dl">Download my answers (CSV)</button>
      <label class="switch"><input type="checkbox" id="snd" ${store.sound ? "checked" : ""}> Sound effects</label>
    </div>
    <div class="card danger"><h3>Not ${esc(prof.name.split(" ")[0])}?</h3><p class="small">On a shared computer, switch player before you start. This clears the progress saved in this browser.</p><button class="btn" id="switch">Switch player</button></div>
  </section>`;
    $("#dl").addEventListener("click", () => download(`byteville-${prof.name.replace(/\W+/g, "_")}.csv`, myCsv()));
    $("#snd").addEventListener("change", (e) => {
      store.sound = e.target.checked;
      persist();
    });
    $("#switch").addEventListener("click", () => modal("<h3>Switch player?</h3><p>This erases the points and badges saved in this browser. Answers already sent to your teacher stay safe.</p>", [
      { label: "Cancel", onClick: () => void 0 },
      { label: "Yes, switch player", primary: true, onClick: () => {
        void flush();
        resetProgress();
        store.profile = null;
        persist();
        try {
          localStorage.removeItem("byteville-log-v1");
        } catch (_) {
        }
        go("welcome");
      } }
    ]));
  }
  function showGrad() {
    renderHeader("map");
    const p = store.progress;
    if (p.done.length < CHAPTERS.length) return go("map");
    confetti();
    app.innerHTML = `<section class="cert">
    <div class="cert-inner">
      <p class="eyebrow">Byteville Defenders Training Camp</p>
      <h1>Certificate of Graduation</h1>
      <p>This certifies that</p>
      <p class="cert-name">${esc(store.profile.name)}</p>
      <p>has protected all eight places in Byteville and learned the CIA triad, strong passwords and MFA, phishing, security controls, firewalls, rule order, intrusion detection, and intrusion prevention.</p>
      <div class="cert-row"><span><b>${p.points}</b> points</span><span><b>${totalStars()}</b> of ${maxStars()} stars</span><span><b>${p.badges.length}</b> badges</span><span>Rank: <b>${rankFor(p.points).name}</b></span></div>
      <div class="cert-sign">${ada(48)}<div><b>Officer Ada</b><small>Chief of Security, Byteville</small></div><span class="cert-date">${(/* @__PURE__ */ new Date()).toLocaleDateString(void 0, { year: "numeric", month: "long", day: "numeric" })}</span></div>
    </div>
    <p class="center muted">Take a screenshot to share it with your teacher. Want more stars? Replay any chapter from the map.</p>
    <div class="row-gap center"><button class="btn btn-primary btn-big" id="gnw">Start Night Watch (advanced)</button><button class="btn" id="gm">Back to the map</button></div>
  </section>`;
    $("#gm").addEventListener("click", () => go("map"));
    $("#gnw").addEventListener("click", () => go("nightwatch"));
  }
  go(store.profile ? "map" : "welcome");
})();

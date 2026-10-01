// Control Room levels: a Linux terminal on a simulated school web server (web01).
// Defense only: investigate logs, check the network, and harden the server.

export interface OpLevel {
  id: string; num: number; title: string; skill: string;
  kind: 'answer' | 'ufw' | 'chmod';
  mission: string;
  ask?: string;               // what to submit, for answer levels
  commands: [string, string][];
  hints: [string, string];
  startDir?: string;
}

export const OP_LEVELS: OpLevel[] = [
  { id: 'op1', num: 1, title: 'First Shift', skill: 'pwd, ls, cat', kind: 'answer',
    mission: 'You just logged in to web01, the server behind the school website. Find out where you are, look around, and read the welcome file.',
    ask: 'Submit the shift token written in the welcome file.',
    commands: [['pwd', 'print the folder you are in'], ['ls', 'list what is in this folder'], ['cat FILE', 'print a file'], ['submit ANSWER', 'send your answer']],
    hints: ['Type ls and press Enter. Do you see a file called README?', 'Type  cat README  and copy the token into  submit TOKEN'] },
  { id: 'op2', num: 2, title: 'Hidden in Plain Sight', skill: 'hidden files', kind: 'answer',
    mission: 'The day shift left you a note in your home folder, but a plain ls does not show it.',
    ask: 'Submit the token from the hidden note.',
    commands: [['ls -a', 'list ALL files, including hidden ones'], ['cd ~', 'go to your home folder'], ['cat .NAME', 'read a hidden file']],
    hints: ['On Linux, a file whose name starts with a dot is hidden.', 'Run  ls -a  and look for a name starting with a dot that sounds like a note.'] },
  { id: 'op3', num: 3, title: 'Count the Failures', skill: 'grep and wc', kind: 'answer',
    mission: 'Someone may be guessing passwords. The login log is /var/log/auth.log.',
    ask: 'How many lines in /var/log/auth.log contain "Failed password"? Submit the number.',
    commands: [['cd /var/log', 'go to the log folder'], ["grep 'TEXT' FILE", 'show lines containing TEXT'], ['wc -l', 'count lines'], ['A | B', 'send the output of A into B'], ['grep -c', 'count matching lines directly']],
    hints: ["Try  grep 'Failed password' /var/log/auth.log  to see the lines.", "Count them:  grep 'Failed password' /var/log/auth.log | wc -l"] },
  { id: 'op4', num: 4, title: 'Loudest Knocker', skill: 'sort and uniq -c', kind: 'answer',
    mission: 'The firewall log /var/log/ufw.log records every blocked connection. One source address was blocked far more than any other.',
    ask: 'Submit the source IP address that was blocked the most times.',
    commands: [["grep -o 'SRC=[0-9.]*'", 'print only the source address part'], ['sort', 'sort lines'], ['uniq -c', 'count repeated lines (use after sort)'], ['sort -n', 'sort by number'], ['tail -3', 'last 3 lines']],
    hints: ["Pull out just the sources:  grep -o 'SRC=[0-9.]*' /var/log/ufw.log", "Count them:  grep -o 'SRC=[0-9.]*' /var/log/ufw.log | sort | uniq -c | sort -n | tail -3"] },
  { id: 'op5', num: 5, title: 'Know Your Address', skill: 'ifconfig and ip', kind: 'answer',
    mission: 'Before you can protect a server, you need to know its address on the network.',
    ask: "Submit web01's IPv4 address on eth0.",
    commands: [['ifconfig', 'show network interfaces'], ['ip a', 'the modern way to show addresses'], ['ping HOST', 'check if another machine answers']],
    hints: ['Run  ifconfig  and look at the eth0 section, not lo.', 'The address is on the line that starts with  inet  (IPv4), before  netmask.'] },
  { id: 'op6', num: 6, title: 'Unwanted Guest', skill: 'listening ports', kind: 'answer',
    mission: 'Every program that listens on a port is a door into the server. The approved list is in /etc/byteville/allowed-services.txt.',
    ask: 'One port is listening that is NOT on the approved list. Submit its port number.',
    commands: [['ss -tuln', 'list listening ports (t=TCP u=UDP l=listening n=numbers)'], ['ss -tulnp', 'also show which program'], ['cat FILE', 'read the approved list']],
    hints: ['Compare  ss -tuln  with  cat /etc/byteville/allowed-services.txt', 'Look at the Port after the colon in "Local Address:Port". Which one is not 22, 80, 443, 3306 or 53?'] },
  { id: 'op7', num: 7, title: 'Raise the Shields', skill: 'ufw firewall', kind: 'ufw',
    mission: 'The firewall on web01 is turned off. Set it up: block incoming traffic by default, allow the website (80 and 443), and allow SSH (22) only from the admin network 10.0.5.0/24. Then turn it on.',
    commands: [['sudo ufw status verbose', 'see the firewall (needs sudo)'], ['sudo ufw default deny incoming', 'block anything not allowed'], ['sudo ufw allow 443/tcp', 'open a port'],
      ['sudo ufw allow from 10.0.5.0/24 to any port 22 proto tcp', 'open a port for one network only'], ['sudo ufw enable', 'turn the firewall on'], ['submit', 'test your firewall']],
    hints: ['You need four kinds of commands: default deny incoming, allow 80/tcp and 443/tcp, the admin SSH rule, and enable.', 'Do NOT use  sudo ufw allow 22  because that opens SSH to the whole Internet. Use the "from 10.0.5.0/24" version.'] },
  { id: 'op8', num: 8, title: 'Lock the Drawer', skill: 'file permissions', kind: 'chmod',
    mission: 'There is an old backup of passwords in ~/backup/passwords.txt, and everyone on the server can read and change it.',
    ask: 'Make passwords.txt readable and writable by you only. Then type submit.',
    commands: [['ls -l', 'show permissions like -rw-rw-rw-'], ['chmod 600 FILE', 'owner can read and write, nobody else can'], ['chmod go-rw FILE', 'remove read and write from group and others']],
    hints: ['Run  ls -l ~/backup  and read the first column: rw- for you, rw- for group, rw- for everyone else.', 'Run  chmod 600 ~/backup/passwords.txt  and check with ls -l. You want -rw-------'] },
  { id: 'op9', num: 9, title: 'Priority One', skill: 'reading IDS alerts', kind: 'answer',
    mission: 'The intrusion detection system writes alerts to /var/log/ids/alerts.log. Most are low priority. A few are Priority 1, the most serious.',
    ask: 'Submit the source IP address behind the Priority 1 alerts.',
    commands: [["grep 'Priority: 1' FILE", 'show only the serious alerts'], ["grep -o '[0-9.]*:[0-9]* ->'", 'print only the "SOURCE:port ->" part'], ['cut -d: -f1', 'keep what comes before the colon'], ['sort | uniq -c', 'count each one']],
    hints: ["Start with  grep 'Priority: 1' /var/log/ids/alerts.log", 'In each line, the attacker is just before the arrow:  SOURCE:port -> DESTINATION:port. Submit the IP without the port.'] },
  { id: 'op10', num: 10, title: 'Incident Response', skill: 'investigate and block', kind: 'ufw',
    mission: 'Alarms are going off. Someone is hammering the login page. Find them in /var/log/nginx/access.log, then block them at the firewall without breaking the website for everyone else.',
    commands: [["awk '{print $1}' FILE", 'print the first column (the visitor IP)'], ['sort | uniq -c | sort -n', 'count and rank'], ["grep 'POST /login'", 'only login attempts'],
      ['sudo ufw status numbered', 'see rules with numbers'], ['sudo ufw insert 1 deny from IP', 'put a block rule at the TOP'], ['submit', 'test your firewall']],
    hints: ["Find the loudest login visitor:  grep 'POST /login' /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -n | tail -3",
      'A rule added with  ufw deny  goes to the BOTTOM, after "allow 443", so it never matches. Use  sudo ufw insert 1 deny from IP'] },
];

export const opBase = (n: number): number => 50 + n * 10;

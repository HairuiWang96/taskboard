# Linux — Senior Developer Deep Reference

> Covers kernel architecture, processes, filesystem, networking, permissions, performance, and system administration.

---

## Table of Contents

1. [Kernel Architecture](#1-kernel-architecture)
2. [Process Management](#2-process-management)
3. [Filesystem & Storage](#3-filesystem--storage)
4. [Networking](#4-networking)
5. [Users, Groups & Permissions](#5-users-groups--permissions)
6. [System Administration](#6-system-administration)
7. [Performance & Monitoring](#7-performance--monitoring)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Kernel Architecture

### Kernel Space vs User Space

```text
‼️ Linux splits memory into two protection domains:

Kernel Space:
  - Full hardware access, privileged instructions
  - Contains: kernel, device drivers, kernel modules
  - Memory is mapped into every process's virtual address space (but not accessible)
  - Bugs here crash the whole system

User Space:
  - Restricted — cannot directly access hardware or kernel memory
  - Every process has its own virtual address space (isolated)
  - System calls cross the boundary via syscall instruction

System call flow:
  Application → glibc wrapper → syscall instruction → kernel trap → sys_call_table
  → kernel function → return → user space resumes

‼️ Common syscalls: read, write, open, close, fork, exec, mmap, socket, accept, epoll

Kernel components:
  Process scheduler   — decides which process runs on which CPU core
  Virtual Memory Mgr  — page tables, demand paging, swap
  VFS (Virtual FS)    — unified file abstraction over ext4, btrfs, NFS, tmpfs, etc.
  Networking stack    — TCP/IP implementation in kernel
  Device drivers      — char devices, block devices, network drivers
```

### Virtual Memory & Paging

```text
‼️ Every process sees a flat 64-bit virtual address space (48-bit usable on x86-64)
   Virtual addresses mapped to physical RAM via page tables (4KB pages by default)
   Kernel manages the mapping — process cannot access another's memory

Memory regions of a process:
  Text (code) — read-only, executable, shared between same-program instances
  Data — initialized globals
  BSS  — uninitialized globals (zero pages, CoW)
  Heap — grows upward via brk()/mmap()
  Stack — grows downward, per-thread
  mmap — shared libraries, file mappings, anonymous mmap

Page fault types:
  Minor fault — page is in memory but not mapped (demand paging). Fast.
  Major fault — page is on disk (swapped out or file-backed). Slow — disk I/O.

‼️ OOM Killer:
  When system runs out of memory → kernel OOM killer picks and kills a process
  Score based on memory use, nice level, child processes
  /proc/<pid>/oom_score — current score
  /proc/<pid>/oom_score_adj — adjust score (-1000 to 1000, -1000 = never kill)
```

---

## 2. Process Management

### Processes & Threads

```bash
# View processes
ps aux                      # all processes, BSD format
ps -ef                      # all processes, System V format
ps -eo pid,ppid,user,stat,vsz,rss,comm  # custom columns

pstree -p                   # visual process tree with PIDs
top                         # interactive live view
htop                        # improved top (usually needs install)

# Process states (STAT column)
# R — Running or runnable (on CPU or in run queue)
# S — Sleeping (interruptible — waiting for event, wakes on signal)
# D — Uninterruptible sleep (waiting for I/O — cannot be killed!) ‼️
# T — Stopped (SIGSTOP or traced)
# Z — Zombie (exited but parent hasn't wait()ed) ‼️
# I — Idle kernel thread

# ‼️ D state processes cause load average to spike even with low CPU
# D state means: waiting for disk I/O, NFS, or hung device driver

# Fork & Exec model ‼️
# fork() — creates exact copy of parent process (CoW virtual memory)
# exec() — replaces current process image with new program
# Shell: bash → fork → child bash → exec → new program
# Parent must wait() for child or child becomes zombie

# Signals
kill -l                     # list all signals
kill -15 <pid>              # SIGTERM — polite termination (default)
kill -9 <pid>               # SIGKILL — immediate, cannot be caught
kill -1 <pid>               # SIGHUP — hangup, often reload config
kill -0 <pid>               # test existence (no signal sent)
killall -9 firefox          # kill by name

# nice & renice — scheduling priority (-20 = highest, 19 = lowest)
nice -n 10 long-job         # start with nice 10 (lower priority)
renice -n 5 -p <pid>        # change priority of running process
# ‼️ Only root can set negative nice (increase priority)
```

### /proc Filesystem

```bash
# /proc — virtual filesystem exposing kernel internals
/proc/cpuinfo               # CPU information
/proc/meminfo               # memory statistics
/proc/loadavg               # load average: 1min 5min 15min running/total
/proc/net/tcp               # TCP connection table (hex addresses)
/proc/sys/                  # tuneable kernel parameters (sysctl)

# Per-process info
/proc/<pid>/status          # process state, memory, thread count
/proc/<pid>/maps            # virtual memory map
/proc/<pid>/fd/             # open file descriptors
/proc/<pid>/cmdline         # command line arguments
/proc/<pid>/environ         # environment variables
/proc/<pid>/net/            # network info for the process's netns

# Read file descriptor targets
ls -la /proc/<pid>/fd/      # see what files/sockets are open

# ‼️ Useful tricks
cat /proc/$(pgrep nginx)/net/tcp6  # nginx's TCP connections
cat /proc/sys/vm/overcommit_memory # memory overcommit setting
```

---

## 3. Filesystem & Storage

### Filesystem Hierarchy

```text
/          — root of entire filesystem hierarchy
/bin       — essential user binaries (ls, cp, mv) — often symlink to /usr/bin now
/sbin      — system administration binaries (fdisk, ifconfig)
/usr       — user programs, read-only data
/usr/bin   — most user commands
/usr/lib   — libraries for /usr/bin
/etc       — configuration files (text, editable)
/var       — variable data — logs, spool, databases
/var/log   — log files
/tmp       — temporary files (cleared on boot, or via tmpwatch)
/dev       — device files (block and character devices)
/proc      — virtual filesystem — kernel/process info
/sys       — virtual filesystem — hardware/driver info
/home      — user home directories
/root      — root user's home
/run       — runtime data (PIDs, sockets) — cleared on boot
/opt       — optional/third-party software
/mnt       — temporary mount points
/media     — removable media (USB, CD)
```

### Files & Inodes

```bash
# Inode — data structure storing file metadata (NOT name or data)
# Contains: type, permissions, uid/gid, size, timestamps, data block pointers
# File name stored in directory entry pointing to inode number

stat filename               # show inode info, timestamps, permissions
ls -i filename              # show inode number

# Hard links — multiple names pointing to the same inode ‼️
ln original.txt hard-link.txt    # same inode, different name
# Both names are equal — delete one, file still exists via other name
# Cannot span filesystems (inode numbers are per-filesystem)

# Soft (symbolic) links — pointer to a path
ln -s /path/to/target symlink   # symlink points to path string
ls -la symlink                   # shows symlink and target
# Can span filesystems, can point to directories, breaks if target deleted ‼️

# Find files
find /var/log -name "*.log" -mtime -7 -size +1M  # logs modified in last 7 days, >1MB
find /tmp -type f -user nobody -delete            # find and delete
find . -name "*.py" -exec grep -l "import os" {} \;

# Disk usage
df -h                       # filesystem usage
du -sh /var/log/*           # directory sizes
du -sh * | sort -h          # sorted by size
ncdu /var                   # interactive disk usage (needs install)

# File permissions — numeric and symbolic
chmod 755 script.sh         # rwxr-xr-x
chmod u+x,g-w script.sh     # symbolic: add user execute, remove group write
chmod -R 644 /var/www/html  # recursive
chown user:group file       # change owner and group
chown -R www-data:www-data /var/www

# ‼️ Special bits
# setuid (4000) — execute as file owner: chmod u+s /usr/bin/passwd
# setgid (2000) — execute as file group, or inherit group in directory
# sticky (1000) — only owner can delete in directory (e.g., /tmp): chmod +t /tmp
```

---

## 4. Networking

### Network Configuration

```bash
# Modern tools (iproute2) — prefer over deprecated ifconfig/route/netstat

# Interface information
ip addr show                # all interfaces and their addresses
ip addr show eth0           # specific interface
ip link show                # link layer info

# Routing table
ip route show               # routing table
ip route get 8.8.8.8        # which route would be used for this destination

# DNS
cat /etc/resolv.conf        # DNS server configuration
resolvectl status           # systemd-resolved status

# Connections — ss (replacement for netstat) ‼️
ss -tulpn                   # TCP/UDP listening sockets with PID/process
ss -tnp                     # established TCP connections
ss -s                       # summary statistics
ss 'sport = :80'            # connections on port 80

# Testing connectivity
ping -c4 host               # ICMP ping
traceroute host             # path to host (UDP or ICMP)
mtr host                    # combined ping + traceroute, live
curl -v https://example.com # HTTP with verbose headers
curl -I URL                 # HEAD request — headers only

# Port testing
nc -zv host 80 443          # test TCP ports (netcat)
nmap -p 80,443 host         # port scan (need permission to scan)
```

### Firewall — iptables & nftables

```bash
# iptables — Linux packet filtering (still widely used)
# Tables: filter, nat, mangle, raw
# Chains: INPUT, OUTPUT, FORWARD (in filter table)
# ‼️ Policy: default action if no rule matches (ACCEPT or DROP)

iptables -L -n -v --line-numbers   # list rules with packet counts

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# Drop everything else
iptables -P INPUT DROP

# NAT — masquerade outbound traffic (router/NAT)
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Port forwarding
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080

# Save / restore
iptables-save > /etc/iptables/rules.v4
iptables-restore < /etc/iptables/rules.v4

# UFW — simplified firewall (Ubuntu)
ufw allow 22/tcp
ufw allow 'Nginx Full'
ufw deny 3306
ufw enable
ufw status verbose
```

---

## 5. Users, Groups & Permissions

```bash
# User management
useradd -m -s /bin/bash -G sudo alice   # create user with home, shell, group
usermod -aG docker alice                 # add to group (‼️ -a required — append, not replace)
userdel -r alice                         # delete user and home directory
passwd alice                             # set password

# /etc/passwd format:  username:x:uid:gid:comment:home:shell
# /etc/shadow format:  username:$hash:lastchange:min:max:warn:inactive:expire
# /etc/group  format:  groupname:x:gid:members

id alice                    # uid, gid, groups
groups alice                # group membership
who                         # logged-in users
w                           # logged-in users + activity
last                        # login history
lastfail                    # failed logins (/var/log/btmp)

# sudo configuration — /etc/sudoers (edit with visudo ‼️)
# %sudo  ALL=(ALL:ALL) ALL       # sudo group can run any command
# alice  ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx  # passwordless specific cmd
visudo                      # safe edit (validates syntax before saving)

# File ACLs — more granular than rwxrwxrwx
getfacl file.txt            # show ACL
setfacl -m u:alice:rw file.txt   # give alice read+write
setfacl -m g:dev:rx dir/        # give dev group read+execute
setfacl -m d:u:alice:rw dir/    # default ACL — inherited by new files in dir ‼️
setfacl -x u:alice file.txt     # remove entry

# Capabilities — fine-grained privilege (vs setuid root) ‼️
getcap /usr/bin/ping        # cap_net_raw=+ep
setcap cap_net_bind_service=+ep /usr/local/bin/node  # allow bind to port <1024
# ‼️ Capabilities let processes have specific root privileges without being root
```

---

## 6. System Administration

### Systemd

```bash
# Service management
systemctl start   nginx
systemctl stop    nginx
systemctl restart nginx
systemctl reload  nginx       # reload config without full restart (if supported)
systemctl status  nginx       # status + recent logs
systemctl enable  nginx       # start at boot
systemctl disable nginx       # don't start at boot
systemctl is-active nginx     # check if running (exit code 0 = active)

# Logs — journald
journalctl -u nginx           # logs for a unit
journalctl -u nginx -f        # follow (like tail -f)
journalctl -u nginx --since "1 hour ago"
journalctl -p err             # error and above (emerg alert crit err warning notice info debug)
journalctl --disk-usage       # total journal size
journalctl --vacuum-time=7d   # keep only last 7 days of logs

# Unit file — /etc/systemd/system/myapp.service
# [Unit]
# Description=My Application
# After=network.target postgresql.service
#
# [Service]
# Type=simple
# User=myapp
# WorkingDirectory=/opt/myapp
# ExecStart=/opt/myapp/bin/myapp --config /etc/myapp/config.yaml
# Restart=on-failure
# RestartSec=5s
# Environment=NODE_ENV=production
# EnvironmentFile=/etc/myapp/env
# LimitNOFILE=65535          # increase file descriptor limit ‼️
#
# [Install]
# WantedBy=multi-user.target

systemctl daemon-reload       # ‼️ after modifying unit files
```

### Package Management

```bash
# Debian/Ubuntu (apt)
apt update                    # update package index
apt upgrade                   # upgrade installed packages
apt install -y nginx          # install
apt remove nginx              # remove (keep config)
apt purge nginx               # remove + config
apt autoremove                # remove orphaned packages
apt list --installed          # list installed
dpkg -l | grep nginx          # check specific package

# RHEL/CentOS/Rocky (dnf/yum)
dnf update
dnf install -y nginx
dnf remove nginx
dnf list installed
rpm -qa | grep nginx
rpm -qi nginx                 # package info
rpm -ql nginx                 # files installed by package

# Inspecting files
dpkg -S /usr/bin/grep         # which package owns this file
rpm -qf /usr/bin/grep

# Hold package version (prevent upgrade)
apt-mark hold nginx
apt-mark unhold nginx
```

---

## 7. Performance & Monitoring

### CPU & Memory

```bash
# CPU info
nproc                         # number of CPU cores
lscpu                         # CPU architecture details
cat /proc/cpuinfo

# Load average — /proc/loadavg
# 3 numbers: 1-min, 5-min, 15-min average of (running + waiting for CPU/IO processes)
# ‼️ Load > number of CPU cores → system is overloaded
# Load from CPU: pegged at # cores. Load from I/O: D state processes add to average.
uptime
# Example: load average: 2.5, 1.8, 1.2 on 4-core system → fine (2.5/4 = 62% util)

# CPU usage
top                           # press 1 to see per-core
mpstat -P ALL 1               # per-core stats (sysstat package)
pidstat 1                     # per-process CPU usage over time

# Memory
free -h                       # total/used/free/available
# ‼️ "available" is more useful than "free" — includes reclaimable page cache
cat /proc/meminfo
vmstat 1                      # virtual memory stats per second

# Memory per process
ps aux --sort=-%mem | head    # top memory consumers
cat /proc/<pid>/status | grep VmRSS  # resident set size for specific process
pmap -x <pid>                 # detailed memory map

# ‼️ Page cache — kernel caches file reads in RAM
# High cached memory is NORMAL — kernel will reclaim it when apps need RAM
echo 3 > /proc/sys/vm/drop_caches  # drop page cache (never do this on production)
```

### I/O & Network Performance

```bash
# Disk I/O
iostat -xz 1                  # I/O stats per device, per second
iotop -o                      # processes doing I/O right now (like top for I/O)
lsblk                         # block device tree
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# ‼️ Key iostat columns:
# %util  — how busy the device is (100% = saturated)
# await  — average time for I/O request (ms) — includes queue time
# r/s w/s — reads/writes per second
# rkB/s wkB/s — throughput in KB/s

# Network I/O
iftop -i eth0                 # live bandwidth per connection
nload eth0                    # simple in/out throughput
netstat -s                    # protocol statistics (retransmits, errors)
ss -s                         # socket summary

# ‼️ TCP performance indicators:
# High retransmit rate → packet loss, network issues, or remote host overwhelmed
# TIME_WAIT accumulation → normal, connections waited for 2MSL (~60s)
# Many SYN_RECV → SYN flood attack or too-small listen backlog

# sysctl tuning examples
sysctl -a | grep net.core       # network kernel params
sysctl net.core.somaxconn       # max listen backlog (default 128, set to 1024+ for busy servers)
sysctl net.ipv4.tcp_fin_timeout # TIME_WAIT duration (default 60s)

# Apply permanently
echo "net.core.somaxconn=1024" >> /etc/sysctl.conf
sysctl -p                     # reload
```

### Profiling & Tracing

```bash
# strace — trace system calls ‼️ invaluable for debugging
strace -p <pid>               # attach to running process
strace -e openat ls /tmp      # trace only open() calls
strace -c ls /tmp             # summary of syscall counts + time

# lsof — list open files (files, sockets, pipes)
lsof -p <pid>                 # all open files for process
lsof -i :80                   # processes with port 80 open
lsof -i tcp                   # all TCP connections
lsof +D /var/log              # processes with files in directory

# perf — Linux performance counter (sampling profiler)
perf top                      # live CPU profiling (like vtune)
perf stat command             # count hardware events for a command
perf record -g command        # record with call graph
perf report                   # view recorded data

# /proc/net/dev — network interface statistics
cat /proc/net/dev             # bytes/packets tx/rx, errors, drops per interface
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between a process and a thread?
A: Process — independent execution unit with its own virtual address space, file descriptors, signal handlers.
   Thread — execution unit within a process, shares address space and file descriptors with siblings.
   Creating a thread is faster and cheaper than forking a process.
   ‼️ On Linux, both are implemented via clone() syscall — threads are just processes that share resources.

Q: What happens when you run a command in a shell?
A: Shell calls fork() → creates child process → child calls exec() → replaces itself with the program.
   Shell calls wait() to collect the exit status (prevent zombie). I/O redirections applied
   between fork and exec on the child. Pipes connect child stdout to another child's stdin.

Q: What is a zombie process?
A: A process that has exited but whose parent hasn't called wait() to collect its exit status.
   Zombie holds a PID and an entry in the process table but no other resources.
   Fix: parent must call wait(). If parent is dead, orphan is reparented to init/systemd which reaps it.
   ‼️ Many zombies indicate a bug in the parent application.

Q: What is the difference between a hard link and a soft link?
A: Hard link — another directory entry pointing to the same inode. Same file, two names.
   Soft link — file containing a path string. Breaks if target is deleted.
   Hard links can't cross filesystems or link directories (except with special privileges).
   ‼️ rm removes a directory entry. File deleted only when link count reaches 0 and no open FDs.

Q: Explain the Linux boot process.
A: BIOS/UEFI → finds bootloader (GRUB) → GRUB loads kernel + initrd → kernel initializes hardware,
   mounts real root filesystem → kernel starts init (PID 1, systemd) → systemd starts all services
   in dependency order → login prompt.
   ‼️ initrd/initramfs: temporary root filesystem in RAM used to mount the real root (handles LUKS, LVM, etc.)

Q: What is the difference between TCP and UDP?
A: TCP — connection-oriented, reliable (retransmission), ordered delivery, flow control, congestion control.
   UDP — connectionless, no reliability guarantees, lower overhead, supports multicast.
   Use TCP for: HTTP, SSH, database connections. UDP for: DNS, streaming, games, VoIP.

Q: How does the kernel handle memory — what is the page cache?
A: Page cache: kernel caches file data in RAM after reads. Second read comes from RAM (fast).
   Writes go to page cache first (write-back) — flushed to disk by pdflush/kworker.
   ‼️ "Cached" memory in free -h is page cache — available to applications on demand.
   OOM killer fires when even page cache can't provide enough free memory.
```

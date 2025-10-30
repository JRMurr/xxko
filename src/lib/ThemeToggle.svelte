<script lang="ts">
  type Mode = 'light' | 'dark' | 'system';

  let mode = $state<Mode>('system');
  let systemDark = $state(false);
  let effectiveDark = $derived(mode === 'system' ? systemDark : mode === 'dark');

  let mq: MediaQueryList | null = null;
  function readSystem() {
    mq = window.matchMedia('(prefers-color-scheme: dark)');
    systemDark = mq.matches;
    const onChange = (e: MediaQueryListEvent) => (systemDark = e.matches);
    mq.addEventListener?.('change', onChange);
  }

  // initialize from storage & system
  $effect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem('theme') as Mode | null;
      mode = saved ?? 'system';
      readSystem();
      apply(mode);
    });
  });

  function apply(next: Mode) {
    mode = next;
    localStorage.setItem('theme', next);
    const dark = next === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : next === 'dark';
    document.documentElement.classList.toggle('dark', dark);
  }
</script>

<div class="inline-flex items-center gap-2">
  <label class="text-sm">Theme</label>
  <select
    class="rounded-md border px-2 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
    bind:value={mode}
    onchange={(e) => apply((e.target as HTMLSelectElement).value as Mode)}
    aria-label="Theme"
  >
    <option value="system">System</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>

  <!-- Small live indicator -->
  <span class="text-sm opacity-70">
    {#if effectiveDark}🌙 Dark{/if}{#if !effectiveDark}☀️ Light{/if}
    {#if mode === 'system'} (system){/if}
  </span>
</div>

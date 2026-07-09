const I18N = {
  en: {
    'site.title': 'Code Abyss — Agent OS',
    'site.desc': 'Agent OS for Claude Code, Codex, Gemini CLI & OpenClaw. Install the control plane, attach code graph, verify with doctor. v5.0.0-rc.1',
    'nav.flow': 'Flow',
    'nav.get': 'What you get',
    'nav.docs': 'Docs',
    'hero.badge': 'Agent OS · v5.0.0-rc.1',
    'hero.title': 'Install the OS. Attach the graph. Verify.',
    'hero.sub': 'Judgment kernel, skills, and a real control plane for Claude / Codex / Gemini / OpenClaw. Voice skins are optional. Persona is not the product.',
    'flow.label': 'Critical path',
    'flow.title': 'Three commands. Done.',
    'flow.1.title': 'Install the Agent OS layer',
    'flow.1.desc': 'Skills, lazy kernel, inject map, default character enforcement. Default voice is plain — no role-play.',
    'flow.1.note': 'Swap -t claude for codex / gemini / openclaw.',
    'flow.2.title': 'Install abyss + attach graph hooks',
    'flow.2.desc': 'Code graph is a separate product. code-abyss does not download it or inject graph hooks for the three main hosts.',
    'flow.3.title': 'Verify with doctor',
    'flow.3.desc': 'Version, abyss detect, kernel, enforcement, compose budget, inject map — plus next steps if something is missing.',
    'flow.host': 'Host for snippets',
    'get.label': 'After install',
    'get.title': 'What the OS gives you',
    'get.1.t': 'Control plane',
    'get.1.d': 'doctor · compose · score — operate without re-tarring skills.',
    'get.2.t': 'Lazy judgment',
    'get.2.d': '9 kernel bundles + 30 skills. Inject map forces judgment before execution under pressure.',
    'get.3.t': 'Default enforcement',
    'get.3.d': 'Character Stop-hook on claude/codex. Opt out: --no-enforcement.',
    'get.4.t': 'Plain by default',
    'get.4.d': 'Residual voice only. Optional skins via --persona / --style — never the product core.',
    'later.title': 'Later (optional)',
    'later.note': 'Re-skin guidance without recopying the skill tree. Skip if you just want work done.',
    'copy': 'Copy',
    'footer.mig': '4.x → 5',
    'footer.design': 'Design',
    'footer.skin': 'Submit skin',
  },
  zh: {
    'site.title': 'Code Abyss — Agent OS',
    'site.desc': '面向 Claude Code / Codex / Gemini / OpenClaw 的 Agent OS。装控制面、挂代码图、doctor 体检。v5.0.0-rc.1',
    'nav.flow': '流程',
    'nav.get': '你得到什么',
    'nav.docs': '文档',
    'hero.badge': 'Agent OS · v5.0.0-rc.1',
    'hero.title': '装 OS。挂图谱。体检。',
    'hero.sub': '判断内核、技能，以及真实的控制面——给 Claude / Codex / Gemini / OpenClaw。声音皮肤可选。人格不是产品本身。',
    'flow.label': '关键路径',
    'flow.title': '三条命令。结束。',
    'flow.1.title': '安装 Agent OS 层',
    'flow.1.desc': '技能、懒加载内核、inject 图、默认 character 强制。默认声音 plain——无角色扮演。',
    'flow.1.note': '把 -t claude 换成 codex / gemini / openclaw。',
    'flow.2.title': '安装 abyss 并 attach 代码图 hooks',
    'flow.2.desc': '代码图是独立产品。code-abyss 不为三大宿主下载二进制，也不注入 graph hooks。',
    'flow.3.title': '用 doctor 体检',
    'flow.3.desc': '版本、abyss、内核、enforcement、compose 预算、inject 图——缺什么会给下一步。',
    'flow.host': '命令片段宿主',
    'get.label': '装完之后',
    'get.title': 'OS 给你什么',
    'get.1.t': '控制面',
    'get.1.d': 'doctor · compose · score —— 不必整树重装也能驾驭。',
    'get.2.t': '懒加载判断',
    'get.2.d': '9 内核 bundle + 30 技能。inject 图在压力下强制先判断再执行。',
    'get.3.t': '默认 enforcement',
    'get.3.d': 'claude/codex 默认 character Stop-hook。关掉：--no-enforcement。',
    'get.4.t': '默认 plain',
    'get.4.d': '只留残余声音。皮肤用 --persona / --style —— 永远不是产品核心。',
    'later.title': '以后（可选）',
    'later.note': '不重拷 skill 树即可换皮。只想干活可以跳过。',
    'copy': '复制',
    'footer.mig': '4.x → 5',
    'footer.design': '设计',
    'footer.skin': '投稿皮肤',
  },
};

function getLang() {
  return localStorage.getItem('code-abyss-lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
}

function setLang(lang) {
  localStorage.setItem('code-abyss-lang', lang);
  applyLang(lang);
}

function applyLang(lang) {
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  if (dict['site.title']) document.title = dict['site.title'];
  const meta = document.querySelector('meta[name="description"]');
  if (meta && dict['site.desc']) meta.setAttribute('content', dict['site.desc']);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = dict[key];
    if (val == null) return;
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
    else el.textContent = val;
  });

  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

document.addEventListener('DOMContentLoaded', () => applyLang(getLang()));

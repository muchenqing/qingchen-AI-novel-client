export var BUILTIN_THEMES = {
  mint: {
    '--bg-main': '#F0F7F4',
    '--bg-titlebar': '#E6F2ED',
    '--bg-sidebar': '#E6F2ED',
    '--border': '#D0E6DF',
    '--text-primary': '#2A3D36',
    '--text-secondary': '#556B63',
    '--accent': '#4A7C6B',
    '--accent-hover': '#335C4E',
    '--danger': '#D9534F',
    '--card-bg': '#ffffff',
    '--hover-bg': 'rgba(74, 124, 107, 0.08)',
  },
  paper: {
    '--bg-main': '#F5F0E8',
    '--bg-titlebar': '#EDE8DF',
    '--bg-sidebar': '#EDE8DF',
    '--border': '#D8D0C4',
    '--text-primary': '#3E3529',
    '--text-secondary': '#7A6E5E',
    '--accent': '#8B7355',
    '--accent-hover': '#6B5740',
    '--danger': '#C0392B',
    '--card-bg': '#FDFBF7',
    '--hover-bg': 'rgba(139, 115, 85, 0.08)',
  },
  fog: {
    '--bg-main': '#E8ECF0',
    '--bg-titlebar': '#DDE3EA',
    '--bg-sidebar': '#DDE3EA',
    '--border': '#C4CCD5',
    '--text-primary': '#2C3E50',
    '--text-secondary': '#5D6D7E',
    '--accent': '#5B7B96',
    '--accent-hover': '#456480',
    '--danger': '#E74C3C',
    '--card-bg': '#F0F3F6',
    '--hover-bg': 'rgba(91, 123, 150, 0.08)',
  },
  taro: {
    '--bg-main': '#F2ECF5',
    '--bg-titlebar': '#E9E0EE',
    '--bg-sidebar': '#E9E0EE',
    '--border': '#D5C9DE',
    '--text-primary': '#3D2E4A',
    '--text-secondary': '#7A6B8A',
    '--accent': '#8B6BAF',
    '--accent-hover': '#6B4F8F',
    '--danger': '#D9534F',
    '--card-bg': '#F8F5FA',
    '--hover-bg': 'rgba(139, 107, 175, 0.08)',
  },
};

export var EXTENDED_TEMPLATES = [
  {
    name: 'ocean',
    label: '深海',
    variables: {
      '--bg-main': '#EBF2F8',
      '--bg-titlebar': '#DFE9F0',
      '--bg-sidebar': '#DFE9F0',
      '--border': '#B8CCD9',
      '--text-primary': '#1B3A4B',
      '--text-secondary': '#4A6E82',
      '--accent': '#2E86AB',
      '--accent-hover': '#1F6A88',
      '--danger': '#E74C3C',
      '--card-bg': '#F5F9FC',
      '--hover-bg': 'rgba(46, 134, 171, 0.08)',
    },
  },
  {
    name: 'sunset',
    label: '日落',
    variables: {
      '--bg-main': '#FDF2EC',
      '--bg-titlebar': '#F8E6DA',
      '--bg-sidebar': '#F8E6DA',
      '--border': '#E8C9B5',
      '--text-primary': '#4A2C1A',
      '--text-secondary': '#8B6A50',
      '--accent': '#D4724E',
      '--accent-hover': '#B85A3A',
      '--danger': '#C0392B',
      '--card-bg': '#FFF9F5',
      '--hover-bg': 'rgba(212, 114, 78, 0.08)',
    },
  },
  {
    name: 'forest',
    label: '森林',
    variables: {
      '--bg-main': '#ECF3EC',
      '--bg-titlebar': '#DEE8DE',
      '--bg-sidebar': '#DEE8DE',
      '--border': '#B5CDB5',
      '--text-primary': '#2D3B2D',
      '--text-secondary': '#5E7A5E',
      '--accent': '#3D7A3D',
      '--accent-hover': '#2D5C2D',
      '--danger': '#D9534F',
      '--card-bg': '#F5FAF5',
      '--hover-bg': 'rgba(61, 122, 61, 0.08)',
    },
  },
  {
    name: 'sakura',
    label: '樱花',
    variables: {
      '--bg-main': '#FDF0F3',
      '--bg-titlebar': '#F8E1E7',
      '--bg-sidebar': '#F8E1E7',
      '--border': '#EABDC7',
      '--text-primary': '#4A2532',
      '--text-secondary': '#8A5A6A',
      '--accent': '#D4648A',
      '--accent-hover': '#B84A70',
      '--danger': '#C0392B',
      '--card-bg': '#FFF5F8',
      '--hover-bg': 'rgba(212, 100, 138, 0.08)',
    },
  },
  {
    name: 'midnight',
    label: '午夜',
    variables: {
      '--bg-main': '#E8ECF1',
      '--bg-titlebar': '#D9DFE8',
      '--bg-sidebar': '#D9DFE8',
      '--border': '#B0BAC8',
      '--text-primary': '#1A1F2E',
      '--text-secondary': '#4A5068',
      '--accent': '#4A5A8A',
      '--accent-hover': '#354070',
      '--danger': '#D9534F',
      '--card-bg': '#F0F2F6',
      '--hover-bg': 'rgba(74, 90, 138, 0.08)',
    },
  },
  {
    name: 'lemon',
    label: '柠檬',
    variables: {
      '--bg-main': '#F9F6EC',
      '--bg-titlebar': '#F2EBD8',
      '--bg-sidebar': '#F2EBD8',
      '--border': '#D9CFA5',
      '--text-primary': '#3D3A1E',
      '--text-secondary': '#7A7550',
      '--accent': '#B8A832',
      '--accent-hover': '#96882A',
      '--danger': '#D9534F',
      '--card-bg': '#FDFBF2',
      '--hover-bg': 'rgba(184, 168, 50, 0.08)',
    },
  },
];

export function createThemeCSS(name, variables) {
  var lines = ['.theme-' + name + ' {'];
  var keys = Object.keys(variables);
  for (var i = 0; i < keys.length; i++) {
    lines.push('  ' + keys[i] + ': ' + variables[keys[i]] + ';');
  }
  lines.push('}');
  return lines.join('\n');
}

export function exportThemeJSON(name, variables) {
  return JSON.stringify({ name: name, variables: variables }, null, 2);
}

export function importThemeJSON(jsonStr) {
  try {
    var data = JSON.parse(jsonStr);
    if (!data || typeof data.name !== 'string' || !data.name.trim()) {
      return null;
    }
    if (!data.variables || typeof data.variables !== 'object') {
      return null;
    }
    var required = [
      '--bg-main', '--bg-titlebar', '--bg-sidebar', '--border',
      '--text-primary', '--text-secondary', '--accent', '--accent-hover',
      '--danger', '--card-bg', '--hover-bg',
    ];
    for (var i = 0; i < required.length; i++) {
      if (typeof data.variables[required[i]] !== 'string') {
        return null;
      }
    }
    return { name: data.name.trim(), variables: data.variables };
  } catch (e) {
    return null;
  }
}

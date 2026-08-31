'use client';

import { useState, useRef, useEffect } from 'react';

// Open-source emoji set (Unicode emojis + education-themed stickers)
// No external API needed — all emojis are native Unicode characters

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','🤖'],
  },
  {
    name: 'Education',
    icon: '🎓',
    emojis: ['🎓','📚','📖','📕','📗','📘','📙','📒','📓','📔','✏️','铅笔','✒️','🖊️','🖋️','📝','🖍️','🖌️','🔬','🔭','🧪','🧫','🧬','🔬','📐','📏','✂️','📌','📍','📎','🖇️','🏷️','🎒','🏫','🏫','🎓','🧑‍🎓','👨‍🎓','👩‍🎓','🧑‍🏫','👨‍🏫','👩‍🏫','🧑‍🔬','👨‍🔬','👩‍🔬','🧑‍💻','👨‍💻','👩‍💻','🏅','🥇','🥈','🥉','🏆','🎖️','🏵️','🎗️','📜','📋','🗂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','⚙️','🧰','🧲','💡','🔦','🏮','🪔','🔬','🧪','🧫','🧬','🧯','🧰'],
  },
  {
    name: 'Gestures',
    icon: '👍',
    emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','🙏','🤝','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸','👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵'],
  },
  {
    name: 'Animals',
    icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️'],
  },
  {
    name: 'Food',
    icon: '🍔',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🧈','🥚','🍳','🧇','🥞','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯'],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
  },
  {
    name: 'Travel',
    icon: '✈️',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🛤️','🛣️','🗾','🎑','🏞️','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌌','🌉','🌁'],
  },
  {
    name: 'Objects',
    icon: '⌚',
    emojis: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷️','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒️','🗓️','📆','📅','🗑️','📇','🗃️','🗳️','🗄️','📋','📁','🗂️','🗞️','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'],
  },
  {
    name: 'Symbols',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','🉹','💮','🉐','㊗️','㊙️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','🆙','🆕','🆗','🆒','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙','🔛','🔝','🔜','✅','☑️','✔️','❌','❎','➕','➖','➗','✖️','🟢','🔵','🟡','🟠','🔴','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛'],
  },
  {
    name: 'Flags',
    icon: '🏁',
    emojis: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇺🇸','🇬🇧','🇬🇭','🇳🇬','🇨🇦','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇵🇹','🇧🇷','🇮🇳','🇨🇳','🇯🇵','🇰🇷','🇦🇺','🇿🇦','🇪🇬','🇰🇪','🇪🇹','🇹🇿','🇺🇬','🇨🇮','🇸🇳','🇨🇲','🇿🇼','🇧🇼','🇲🇦','🇩🇿','🇱🇾','🇹🇳','🇸🇩','🇷🇼','🇧🇫','🇲🇱','🇳🇪','🇹🇬','🇧🇯','🇸🇱','🇱🇷','🇬🇲','🇬🇳','🇸🇹','🇲🇷','🇲🇬','🇿🇲','🇲🇿','🇲🇼','🇦🇴','🇨🇩','🇨🇬','🇳🇦','🇧🇮','🇷🇸','🇭🇹','🇯🇲','🇹🇹','🇧🇿','🇧🇸','🇧🇧','🇩🇲','🇱🇨','🇻🇨','🇬🇩','🇦🇬','🇰🇳','🇸🇻','🇭🇳','🇬🇹','🇵🇦','🇨🇷','🇨🇴','🇪🇨','🇵🇪','🇻🇪','🇧🇴','🇵🇾','🇺🇾','🇦🇷','🇨🇱'],
  },
];

// Sticker set — large emoji-style stickers for fun chat effects
const STICKERS: EmojiCategory[] = [
  {
    name: 'Education Stickers',
    icon: '🎓',
    emojis: ['🎓','📚','✏️','🏫','🔬','🧪','🧬','🔭','💡','📝','🏆','🥇','🏅','🎖️','📜','📋','🎒','📐','📏','✂️','📌','📎','🔖','🧠','🦷','🦴','👅','👀','🫀','🫁','🧬','🔬','🧫','🧯','🧰','🧲','⚙️','🔧','🔨','🛠️','💡','🔦','🏮','🪔','🧪','🧫','🧬'],
  },
  {
    name: 'Fun Stickers',
    icon: '🎉',
    emojis: ['🎉','🎊','🎈','🎁','🎀','🪄','🪅','🧧','✨','💫','⭐','🌟','💥','🔥','🌈','☀️','🌙','⚡','❄️','💧','🌊','🌸','🌺','🌻','🌹','🌷','💐','🥳','😎','🤩','🤯','🥶','🤯','🫠','🫡','🫶','🫰','🫵','🫱','🫲','🫳','🫴','🫵','🤟','🤘','🤙','👋','👏','🙌','🙏','💪','🦾','🦿','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸','👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵'],
  },
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onStickerPick?: (sticker: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onPick, onStickerPick, onClose }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const cats = activeTab === 'emoji' ? CATEGORIES : STICKERS;
  const currentEmojis = search
    ? cats.flatMap(c => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i)
    : cats[activeCategory]?.emojis || [];

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 4,
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        zIndex: 100,
        maxHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={() => { setActiveTab('emoji'); setActiveCategory(0); setSearch(''); }}
          style={{
            flex: 1, padding: '10px 0', border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: activeTab === 'emoji' ? 'var(--blue-50)' : 'transparent',
            color: activeTab === 'emoji' ? 'var(--blue)' : 'var(--muted)',
          }}
        >
          😀 Emojis
        </button>
        <button
          onClick={() => { setActiveTab('sticker'); setActiveCategory(0); setSearch(''); }}
          style={{
            flex: 1, padding: '10px 0', border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: activeTab === 'sticker' ? 'var(--blue-50)' : 'transparent',
            color: activeTab === 'sticker' ? 'var(--blue)' : 'var(--muted)',
          }}
        >
          🎨 Stickers
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis..."
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border)', fontSize: 13,
            background: 'var(--bg)', color: 'var(--black)',
          }}
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div style={{
          display: 'flex', overflowX: 'auto', padding: '6px 8px', gap: 4,
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          scrollbarWidth: 'none',
        }} className="carousel-hide-scroll">
          {cats.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              style={{
                fontSize: 18, padding: '4px 8px', borderRadius: 8, border: 0, cursor: 'pointer',
                background: activeCategory === i ? 'var(--blue-50)' : 'transparent',
                flexShrink: 0,
              }}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
        gap: 2,
        alignContent: 'start',
      }}>
        {currentEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => activeTab === 'sticker' && onStickerPick ? onStickerPick(emoji) : onPick(emoji)}
            style={{
              fontSize: activeTab === 'sticker' ? 28 : 22,
              padding: '4px 2px', border: 0, cursor: 'pointer',
              background: 'transparent', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

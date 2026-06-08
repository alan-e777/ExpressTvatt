import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: 'calc(100dvh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        textAlign:     'center',
        maxWidth:      '400px',
        gap:           '12px',
      }}>
        <p style={{
          fontWeight:    600,
          fontSize:      '12px',
          color:         '#6BB3AC',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Express Tvätt
        </p>

        <p style={{
          fontWeight: 700,
          fontSize:   'clamp(72px, 20vw, 120px)',
          color:      '#FFFFFF',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          404
        </p>

        <p style={{
          fontWeight: 700,
          fontSize:   'clamp(20px, 4vw, 24px)',
          letterSpacing: '-0.01em',
          color:      '#FFFFFF',
        }}>
          Sidan hittades inte
        </p>

        <div style={{
          width:      '32px',
          height:     '1px',
          background: 'rgba(255,255,255,0.25)',
          margin:     '4px 0',
        }} />

        <p style={{
          fontWeight: 400,
          fontSize:   '15px',
          color:      'rgba(255,255,255,0.6)',
          lineHeight: '24px',
        }}>
          Sidan du letar efter finns inte längre<br />
          eller har aldrig funnits.
        </p>

        <Link href="/" style={{
          display:         'inline-flex',
          alignItems:      'center',
          justifyContent:  'center',
          height:          '52px',
          background:      '#FFFFFF',
          color:           '#083F41',
          fontWeight:      600,
          fontSize:        '15px',
          padding:         '0 26px',
          borderRadius:    '12px',
          textDecoration:  'none',
          marginTop:       '12px',
        }}>
          Gå till startsidan
        </Link>
      </div>
    </div>
  );
}

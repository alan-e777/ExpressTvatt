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
          fontFamily:    "'Poppins', sans-serif",
          fontWeight:    300,
          fontSize:      '10px',
          color:         'var(--text-muted)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          Express Tvätt
        </p>

        <p style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize:   'clamp(72px, 20vw, 120px)',
          color:      'var(--forest-dark)',
          lineHeight: 1,
        }}>
          404
        </p>

        <p style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize:   'clamp(18px, 4vw, 22px)',
          color:      'var(--text-dark)',
        }}>
          Sidan hittades inte
        </p>

        <div style={{
          width:      '32px',
          height:     '0.5px',
          background: 'rgba(14,92,91,0.3)',
          margin:     '4px 0',
        }} />

        <p style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 400,
          fontSize:   '14px',
          color:      'var(--text-muted)',
          lineHeight: '22px',
        }}>
          Sidan du letar efter finns inte längre<br />
          eller har aldrig funnits.
        </p>

        <Link href="/" style={{
          display:         'inline-flex',
          alignItems:      'center',
          justifyContent:  'center',
          background:      'var(--forest-dark)',
          color:           'var(--moss)',
          fontFamily:      "'Poppins', sans-serif",
          fontWeight:      500,
          fontSize:        '13px',
          padding:         '12px 28px',
          borderRadius:    'var(--radius-md)',
          textDecoration:  'none',
          marginTop:       '8px',
        }}>
          Gå till startsidan
        </Link>
      </div>
    </div>
  );
}

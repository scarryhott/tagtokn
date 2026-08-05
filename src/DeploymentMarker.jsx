export default function DeploymentMarker() {
  return (
    <div
      data-react-deployment="closure-native-workbench"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 9999,
        padding: '10px 14px',
        borderRadius: '999px',
        background: '#111',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        boxShadow: '0 8px 28px rgba(0,0,0,.22)',
      }}
    >
      REACT · CLOSURE WORKBENCH · BUILD 282C+
    </div>
  )
}

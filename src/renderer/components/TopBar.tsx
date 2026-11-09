export function TopBar({ problems }: { problems: number }) {
  return (
    <header className="bar">
      <span className="name">Atril</span>
      <span className="sp" />
      <span className="nag">
        {problems > 0
          ? `${problems} ${problems === 1 ? 'herramienta' : 'herramientas'} por instalar`
          : 'Sin agentes trabajando'}
      </span>
    </header>
  )
}

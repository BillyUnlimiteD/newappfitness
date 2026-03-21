import { TipoUsuario } from '../../types';

const badgeMap: Record<TipoUsuario, string> = {
  ADMINISTRADOR: 'badge-admin',
  COACH:         'badge-coach',
  USUARIO:       'badge-usuario',
  APODERADO:     'badge-apoderado',
};

const labelMap: Record<TipoUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  COACH:         'Coach',
  USUARIO:       'Usuario',
  APODERADO:     'Apoderado',
};

export default function RoleBadge({ role }: { role: TipoUsuario }) {
  return <span className={badgeMap[role]}>{labelMap[role]}</span>;
}

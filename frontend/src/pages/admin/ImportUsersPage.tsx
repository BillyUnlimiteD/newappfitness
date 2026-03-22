import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { usersService } from '../../services/users.service';
import Alert from '../../components/common/Alert';

interface UsuarioFila {
  correo: string;
  nombre?: string;
  apellido?: string;
  rut?: string;
  telefonoContacto?: string;
}

interface ResultadoCreado {
  correo: string;
  nombre: string | null;
  apellido: string | null;
  tempPassword: string;
}

interface ResultadoError {
  correo: string;
  error: string;
}

export default function ImportUsersPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<UsuarioFila[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [resultado, setResultado] = useState<{ creados: ResultadoCreado[]; errores: ResultadoError[] } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResultado(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

        const parsed: UsuarioFila[] = rows.map((row) => ({
          correo: (row['correo'] || row['Correo'] || row['email'] || row['Email'] || '').toString().trim(),
          nombre: (row['nombre'] || row['Nombre'] || '').toString().trim() || undefined,
          apellido: (row['apellido'] || row['Apellido'] || '').toString().trim() || undefined,
          rut: (row['rut'] || row['RUT'] || row['Rut'] || '').toString().trim() || undefined,
          telefonoContacto: (row['telefono'] || row['Telefono'] || row['telefonoContacto'] || row['TelefonoContacto'] || '').toString().trim() || undefined,
        })).filter((r) => r.correo);

        if (parsed.length === 0) {
          setError('No se encontraron filas válidas. Asegúrate de que el archivo tenga una columna "correo".');
          return;
        }
        setFilas(parsed);
      } catch {
        setError('Error al leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (filas.length === 0) return;
    setIsImporting(true);
    setError('');
    try {
      const res = await usersService.importar(filas);
      setResultado(res);
      setFilas([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError('Error al importar usuarios.');
    } finally {
      setIsImporting(false);
    }
  };

  const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['correo', 'nombre', 'apellido', 'rut', 'telefono'],
      ['juan@ejemplo.com', 'Juan', 'Pérez', '12345678-9', '+56912345678'],
      ['maria@ejemplo.com', 'María', 'González', '98765432-1', '+56987654321'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, 'plantilla_importar_usuarios.xlsx');
  };

  const descargarResultado = () => {
    if (!resultado) return;
    const rows = resultado.creados.map((u) => ({
      Correo: u.correo,
      Nombre: u.nombre || '',
      Apellido: u.apellido || '',
      'Contraseña Temporal': u.tempPassword,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const errRows = resultado.errores.map((e) => ({ Correo: e.correo, Error: e.error }));
    const wsErr = XLSX.utils.json_to_sheet(errRows.length > 0 ? errRows : [{ Correo: 'Sin errores', Error: '' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Creados');
    XLSX.utils.book_append_sheet(wb, wsErr, 'Errores');
    XLSX.writeFile(wb, 'resultado_importacion.xlsx');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900">Importar Usuarios</h1>
        <p className="text-dark-500 mt-0.5">Carga masiva de usuarios desde un archivo Excel</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Instrucciones */}
      <div className="card mb-6">
        <h2 className="font-semibold text-dark-900 mb-3">Instrucciones</h2>
        <ul className="text-sm text-dark-600 space-y-1 list-disc list-inside">
          <li>El archivo debe ser <strong>.xlsx</strong> o <strong>.xls</strong></li>
          <li>La primera fila debe ser el encabezado con los nombres de columnas</li>
          <li>Columna obligatoria: <code className="bg-dark-100 px-1 rounded">correo</code></li>
          <li>Columnas opcionales: <code className="bg-dark-100 px-1 rounded">nombre</code>, <code className="bg-dark-100 px-1 rounded">apellido</code>, <code className="bg-dark-100 px-1 rounded">rut</code>, <code className="bg-dark-100 px-1 rounded">telefono</code></li>
          <li>Todos los usuarios se crearán con rol <strong>Usuario</strong> y contraseña temporal</li>
        </ul>
        <button onClick={descargarPlantilla} className="btn-secondary text-sm mt-4">
          Descargar plantilla Excel
        </button>
      </div>

      {/* Carga de archivo */}
      <div className="card mb-6">
        <h2 className="font-semibold text-dark-900 mb-3">Seleccionar archivo</h2>
        <div
          className="border-2 border-dashed border-dark-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <svg className="w-10 h-10 text-dark-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {fileName ? (
            <p className="text-primary-700 font-medium">{fileName}</p>
          ) : (
            <>
              <p className="text-dark-600 font-medium">Haz clic para seleccionar un archivo</p>
              <p className="text-dark-400 text-sm mt-1">.xlsx o .xls</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      </div>

      {/* Vista previa */}
      {filas.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-dark-900">Vista previa — {filas.length} usuarios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-100">
                  <th className="text-left py-2 pr-4 text-dark-500 font-medium">Correo</th>
                  <th className="text-left py-2 pr-4 text-dark-500 font-medium">Nombre</th>
                  <th className="text-left py-2 pr-4 text-dark-500 font-medium">Apellido</th>
                  <th className="text-left py-2 pr-4 text-dark-500 font-medium">RUT</th>
                  <th className="text-left py-2 text-dark-500 font-medium">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 10).map((f, i) => (
                  <tr key={i} className="border-b border-dark-50">
                    <td className="py-2 pr-4 text-dark-900">{f.correo}</td>
                    <td className="py-2 pr-4 text-dark-600">{f.nombre || '—'}</td>
                    <td className="py-2 pr-4 text-dark-600">{f.apellido || '—'}</td>
                    <td className="py-2 pr-4 text-dark-600">{f.rut || '—'}</td>
                    <td className="py-2 text-dark-600">{f.telefonoContacto || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > 10 && (
              <p className="text-xs text-dark-400 mt-2">... y {filas.length - 10} más</p>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleImport} disabled={isImporting} className="btn-primary">
              {isImporting ? 'Importando...' : `Importar ${filas.length} usuarios`}
            </button>
            <button onClick={() => { setFilas([]); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark-900">Resultado de importación</h2>
            <button onClick={descargarResultado} className="btn-secondary text-sm">
              Descargar resultado Excel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{resultado.creados.length}</p>
              <p className="text-sm text-green-600 mt-0.5">Usuarios creados</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{resultado.errores.length}</p>
              <p className="text-sm text-red-600 mt-0.5">Con error</p>
            </div>
          </div>

          {resultado.creados.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-dark-700 mb-2">Creados correctamente</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-100">
                      <th className="text-left py-1.5 pr-4 text-dark-500 font-medium">Correo</th>
                      <th className="text-left py-1.5 pr-4 text-dark-500 font-medium">Nombre</th>
                      <th className="text-left py-1.5 text-dark-500 font-medium">Contraseña temporal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.creados.map((u, i) => (
                      <tr key={i} className="border-b border-dark-50">
                        <td className="py-1.5 pr-4 text-dark-900">{u.correo}</td>
                        <td className="py-1.5 pr-4 text-dark-600">{u.nombre} {u.apellido}</td>
                        <td className="py-1.5 font-mono text-primary-700 font-semibold">{u.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultado.errores.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">Errores</h3>
              <div className="space-y-1">
                {resultado.errores.map((e, i) => (
                  <div key={i} className="flex gap-3 text-sm p-2 bg-red-50 rounded-lg">
                    <span className="text-dark-700 font-medium">{e.correo}</span>
                    <span className="text-red-600">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

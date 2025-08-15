export const SeguimientoView: React.FC = () => {
  return (
    <main className="flex-grow bg-gray-50 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        Detalles de Seguimiento
      </h3>
      <div className="bg-white p-4 rounded shadow">
        <p className="text-gray-500">
          Seleccione un proyecto y persona de la izquierda para ver o
          añadir compromisos (funcionalidad pendiente).
        </p>
      </div>
    </main>
  );
};
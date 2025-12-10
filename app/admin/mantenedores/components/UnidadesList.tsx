"use client";

import { useState, useEffect } from "react";

interface UnidadMedida {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
    tipo: string | null;
    activo: boolean;
}

export default function UnidadesList() {
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUnidades();
    }, []);

    const fetchUnidades = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maestras/unidades`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUnidades(data);
            }
        } catch (error) {
            console.error("Error cargando unidades:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-4">Cargando...</div>;

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Símbolo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {unidades.map((unidad) => (
                            <tr key={unidad.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{unidad.codigo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{unidad.nombre}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{unidad.simbolo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{unidad.tipo || "-"}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${unidad.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                        {unidad.activo ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";

interface TipoProducto {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
}

export default function TiposList() {
    const [tipos, setTipos] = useState<TipoProducto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maestras/tipos`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setTipos(data);
            }
        } catch (error) {
            console.error("Error cargando tipos:", error);
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tipos.map((tipo) => (
                            <tr key={tipo.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{tipo.codigo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{tipo.nombre}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tipo.descripcion || "-"}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tipo.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                        {tipo.activo ? "Activo" : "Inactivo"}
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

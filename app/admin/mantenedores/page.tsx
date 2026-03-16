"use client";

import { useState } from "react";
import CategoriasList from "./components/CategoriasList";
import TiposList from "./components/TiposList";
import UnidadesList from "./components/UnidadesList";
import ProveedoresList from "./components/ProveedoresList";
import TiposProveedorList from "./components/TiposProveedorList";
import LocalesList from "./components/LocalesList";
import TiposDocumentoList from "./components/TiposDocumentoList";
import TiposPedidoList from "./components/TiposPedidoList";
import TiposVehiculoList from "./components/TiposVehiculoList";
import EstadosEnrolamientoList from "./components/EstadosEnrolamientoList";
import UbicacionesList from "./components/UbicacionesList";
import MediosPagoList from "./components/MediosPagoList";
import CanalesVentaList from "./components/CanalesVentaList";

export default function MantenedoresPage() {
    const [activeTab, setActiveTab] = useState<string | null>(null);

    const opciones = [
        { id: "ubicaciones",           icono: "🗄️",  titulo: "Ubicaciones",             desc: "Ubicaciones físicas del almacén" },
        { id: "estados_enrolamiento",  icono: "🟢",  titulo: "Estados de Enrolamiento", desc: "Estados del proceso de enrolamiento" },
        { id: "tipos_vehiculo",        icono: "🚚",  titulo: "Tipos de Vehículo",        desc: "Vehículos para logística y enrolamientos" },
        { id: "paletas_colores",       icono: "🎨",  titulo: "Paleta de Colores",        desc: "Colores del sistema" },
        { id: "categorias",            icono: "📦",  titulo: "Categorías",               desc: "Categorías de productos y puntos" },
        { id: "tipos",                 icono: "🏷️",  titulo: "Tipos de Producto",        desc: "Materia Prima, Elaborado, etc." },
        { id: "unidades",              icono: "📏",  titulo: "Unidades de Medida",       desc: "Unidades con soporte de conversiones" },
        { id: "locales",               icono: "🏪",  titulo: "Locales",                  desc: "Locales y puntos de venta" },
        { id: "proveedores",           icono: "🏢",  titulo: "Proveedores",              desc: "Proveedores de insumos y materias primas" },
        { id: "tipos_proveedor",       icono: "🏭",  titulo: "Tipos Proveedor",          desc: "Clasificación de proveedores" },
        { id: "tipos_documento",       icono: "📄",  titulo: "Tipos Documento",          desc: "Factura, Boleta, Guía, etc." },
        { id: "tipos_pedido",          icono: "📦",  titulo: "Tipos Pedido",             desc: "Tipos de pedido y locales de despacho" },
        { id: "medios_pago",           icono: "💳",  titulo: "Medios de Pago",           desc: "Medios de pago y descuentos al contado" },
        { id: "canales_venta",         icono: "📡",  titulo: "Canales de Venta",         desc: "POS, Landing, WhatsApp, Teléfono y otros" },
        { id: "config_landing",        icono: "🌐",  titulo: "Config. Landing",          desc: "Apariencia de la landing page" },
        { id: "usuarios",              icono: "👤",  titulo: "Usuarios",                 desc: "Usuarios, roles y permisos" },
        { id: "tenants",               icono: "🏢",  titulo: "Tenants (SaaS)",           desc: "Gestión de clientes de la plataforma" },
    ];

    const opcionActiva = opciones.find(o => o.id === activeTab);

    return (
        <div>
            <div className="mb-6 flex items-center gap-4">
                {activeTab && (
                    <button
                        onClick={() => setActiveTab(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        ← Volver
                    </button>
                )}
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        {opcionActiva ? `${opcionActiva.icono} ${opcionActiva.titulo}` : "⚙️ Mantenedores"}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {opcionActiva ? opcionActiva.desc : "Gestión de tablas maestras del sistema"}
                    </p>
                </div>
            </div>

            {/* Grilla de selección */}
            {!activeTab && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {opciones.map(op => (
                        <button
                            key={op.id}
                            onClick={() => setActiveTab(op.id)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary rounded-xl p-5 text-left transition-all group"
                        >
                            <div className="text-3xl mb-3">{op.icono}</div>
                            <div className="font-semibold text-white text-sm group-hover:text-primary transition-colors">
                                {op.titulo}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 leading-snug">{op.desc}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Contenido del mantenedor seleccionado */}
            {activeTab && (
            <div className="bg-slate-800 rounded-lg p-6">
                {activeTab === "ubicaciones" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Ubicaciones en Almacén</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona las ubicaciones físicas del almacén para asignación de lotes y stock.
                        </p>
                        <UbicacionesList />
                    </div>
                )}
                {activeTab === "estados_enrolamiento" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Estados de Enrolamiento</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los estados posibles de un enrolamiento (ej: Pendiente, En Proceso, Finalizado, etc.)
                        </p>
                        <EstadosEnrolamientoList />
                    </div>
                )}
                {activeTab === "tipos_vehiculo" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Vehículo</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de vehículo utilizados en enrolamientos y logística.
                        </p>
                        <TiposVehiculoList />
                    </div>
                )}

                {activeTab === "paletas_colores" && (() => {
                    // Dynamic require to avoid build error
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const PaletasColoresList = require("./components/PaletasColoresList").default;
                    return <PaletasColoresList />;
                })()}

                {activeTab === "categorias" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Categorías de Producto</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona las categorías de productos y puntos de fidelidad
                        </p>
                        <CategoriasList />
                    </div>
                )}

                {activeTab === "tipos" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Producto</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de producto (Materia Prima, Producto Elaborado, etc.)
                        </p>
                        <TiposList />
                    </div>
                )}

                {activeTab === "unidades" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Unidades de Medida</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona las unidades de medida con soporte para conversiones
                        </p>
                        <UnidadesList />
                    </div>
                )}

                {activeTab === "locales" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Locales</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los locales o puntos de venta del negocio
                        </p>
                        <LocalesList />
                    </div>
                )}

                {activeTab === "proveedores" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Proveedores</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los proveedores para compras de insumos y materias primas
                        </p>
                        <ProveedoresList />
                    </div>
                )}

                {activeTab === "tipos_proveedor" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Proveedor</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de proveedor (Materias Primas, Insumos, Servicios, etc.)
                        </p>
                        <TiposProveedorList />
                    </div>
                )}

                {activeTab === "tipos_documento" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Documento</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de documento tributario (Factura, Boleta, Guía, etc.)
                        </p>
                        <TiposDocumentoList />
                    </div>
                )}

                {activeTab === "tipos_pedido" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Pedido</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de pedido y sus locales de despacho por defecto
                        </p>
                        <TiposPedidoList />
                    </div>
                )}

                {activeTab === "medios_pago" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Medios de Pago</h2>
                        <p className="text-gray-400 mb-4">
                            Configura los medios de pago y marca cuáles son al contado para aplicar descuentos en preventas
                        </p>
                        <MediosPagoList />
                    </div>
                )}

                {activeTab === "canales_venta" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Canales de Venta</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los canales de origen de ventas. Los 4 canales del sistema (POS, LANDING, WHATSAPP, TELEFONO) no pueden eliminarse.
                        </p>
                        <CanalesVentaList />
                    </div>
                )}

                {activeTab === "config_landing" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Configuración de Landing Page</h2>
                        <p className="text-gray-400 mb-4">
                            Personaliza la apariencia y contenido de tu landing page
                        </p>
                        <div className="bg-slate-700 rounded-lg p-6 text-center">
                            <p className="text-gray-300 mb-4">
                                La configuración de landing está disponible en una página dedicada
                            </p>
                            <a
                                href="/admin/configuracion/landing"
                                className="inline-block bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                🌐 Ir a Configuración de Landing
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === "usuarios" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Usuarios del Sistema</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona usuarios, roles y permisos del sistema
                        </p>
                        <div className="bg-slate-700 rounded-lg p-6 text-center">
                            <p className="text-gray-300 mb-4">
                                La gestión de usuarios está disponible en una página dedicada
                            </p>
                            <a
                                href="/admin/usuarios"
                                className="inline-block bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                👤 Ir a Gestión de Usuarios
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === "tenants" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tenants Multi-Tenant SaaS</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona clientes de la plataforma (activar/desactivar, ajustar correlativos)
                        </p>
                        <div className="bg-slate-700 rounded-lg p-6 text-center">
                            <p className="text-gray-300 mb-4">
                                La gestión de tenants está disponible en una página dedicada
                            </p>
                            <a
                                href="/admin/tenants"
                                className="inline-block bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                🏢 Ir a Gestión de Tenants
                            </a>
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    );
}

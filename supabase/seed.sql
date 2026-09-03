-- ============================================================
--  AYM Propiedades — Carga inicial (generado automáticamente)
--  Generado por scripts/generar_seed.py — no editar a mano.
--
--  Ejecutar DESPUÉS de supabase/schema.sql, en el SQL Editor.
--  Es seguro ejecutarlo más de una vez: no duplica ni pisa nada.
-- ============================================================

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-001', 'Propiedad AM-001 (falta completar)', 'Venta', 'Casa', null, null, 'Disponible',
   null, null, null, null,
   null, null, null, null, '["/fotos/AM-001/portada.jpg", "/fotos/AM-001/1.jpg", "/fotos/AM-001/2.jpg", "/fotos/AM-001/3.jpg", "/fotos/AM-001/4.jpg", "/fotos/AM-001/5.jpg", "/fotos/AM-001/6.jpg", "/fotos/AM-001/7.jpg", "/fotos/AM-001/8.jpg", "/fotos/AM-001/9.jpg", "/fotos/AM-001/10.jpg", "/fotos/AM-001/11.jpg", "/fotos/AM-001/12.jpg", "/fotos/AM-001/13.jpg", "/fotos/AM-001/14.jpg"]'::jsonb, false)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-002', 'Vendo Casa en Quilpué – $205.000.000', 'Venta', 'Casa', 'Quilpué', 'Sector Barros Arana, Quilpué', 'Disponible',
   205000000, null, 'Casa 2 pisos, 5D/2B, 117,07 m² construidos en 227,07 m². Bosca, terraza y 2 estacionamientos.', 'VENDO CASA EN QUILPUÉ – $205.000.000

Ubicación: Sector Barros Arana, Quilpué
Superficie total terreno: 227,07 m²
Construido: 117,07 m²
Orientación: Poniente

Características de la Propiedad:
• 2 pisos
• 5 dormitorios
• Primer piso en albañilería de ladrillo, con vigas y cadenas en hormigón armado (excelente construcción).
• Living y comedor separados
• 2 baños
• Estufa a leña (Bosca) que calefacciona ambos pisos
• Cocina amoblada
• Patio interior con terraza
• 2 amplios estacionamientos con cobertizo
• Muy iluminada

Extras:
• Ampliación en norma y con permisos para desarrollar Pyme de pastelería o similar
• Sector residencial, rodeado de condominios
• Excelente locomoción y conexión a centro de Quilpué y Troncal Sur
• Gas por cilindros de 45 kilos

Condiciones de Venta:
Pago al contado o con crédito hipotecario aprobado

Contacto AYM Propiedades:
+56 9 9000 3574 | +56 9 9682 5523
Facebook: AYM Propiedades | Instagram: @alarconymatus.propiedades',
   5, 2, 117.07, 227.07, '["/fotos/AM-002/2.VCEQ 1.jpg", "/fotos/AM-002/2.VCEQ 3.jpg", "/fotos/AM-002/2.VCEQ 4.jpg", "/fotos/AM-002/2.VCEQ 5.jpg", "/fotos/AM-002/2.VCEQ 6.jpg", "/fotos/AM-002/2.VCEQ 7.jpg", "/fotos/AM-002/2.VCEQ 8.jpg", "/fotos/AM-002/2.VCEQ 9.jpg", "/fotos/AM-002/2.VCEQ 10.jpg", "/fotos/AM-002/2.VCEQ 11.jpg", "/fotos/AM-002/2.VCEQ 12.jpg", "/fotos/AM-002/2.VCEQ 13.jpg", "/fotos/AM-002/2.VCEQ 14.jpg", "/fotos/AM-002/2.VCEQ 15.jpg", "/fotos/AM-002/2.VCEQ 16.jpg", "/fotos/AM-002/2.VCEQ 17.jpg", "/fotos/AM-002/2.VCEQ 18.jpg", "/fotos/AM-002/2.VCEQ 19.jpg", "/fotos/AM-002/2.VCEQ 20.jpg", "/fotos/AM-002/2.VCEQ 21.jpg", "/fotos/AM-002/2.VCEQ 22.jpg", "/fotos/AM-002/2.VCEQ 23.jpg", "/fotos/AM-002/2.VCEQ 24.jpg", "/fotos/AM-002/2.VCEQ 25.jpg", "/fotos/AM-002/2.VCEQ 26.jpg", "/fotos/AM-002/2.VCEQ 27.jpg", "/fotos/AM-002/2.VCEQ 28.jpg", "/fotos/AM-002/2.VCEQ 29.jpg", "/fotos/AM-002/2.VCEQ 30.jpg", "/fotos/AM-002/2.VCEQ 31.jpg", "/fotos/AM-002/2.VCEQ 32.jpg", "/fotos/AM-002/2.VCEQ 33.jpg", "/fotos/AM-002/2.VCEQ 34.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-003', 'Venta de Casa + 2 Cabañas – Villa Alemana Norte $270.000.000', 'Venta', 'Casa', 'Villa Alemana', 'Villa Alemana Norte', 'Disponible',
   270000000, null, 'Terreno 408 m². Casa 101 m² + 2 cabañas de 22 m² c/u regularizadas. Renta aprox. $290.000/mes.', 'VENTA DE CASA + 2 CABAÑAS – VILLA ALEMANA NORTE $270.000.000
Precio: $270.000.000

Ubicación: Sector Norte de Villa Alemana
Terreno: 408 m²
Construcción principal: 101 m²
Cabañas: 2 unidades de 22 m² c/u (regularizadas con planos y permisos)
Ingresos mensuales aprox.: $290.000

Casa Principal
• Construcción en albañilería de ladrillo (año 1985), recubierta en cemento.
• Vigas, cadenas, radier y fundaciones de excelente calidad.
• Amplio living comedor con orientación oriente (recibe sol de mañana).
• 3 dormitorios con closet y amplias ventanas (orientación norte y poniente).
• 1 baño con tina, lavamanos e instalación de lavadora.
• Cocina amoblada con salida a patio.
• Estacionamiento para 3 vehículos.
• Antejardín con bellas plantas y patio trasero amplio e independiente.
• Leñera para estufa a leña (Bosca).

Cabañas Independientes (2 unidades de 22 m² c/u)
• 1 dormitorio • Estar • Cocina • Baño • Logia con patio particular
• Acceso independiente desde calle por reja principal y área común
• Sin estacionamiento

(Ambas cabañas modernas, regularizadas y generando renta mensual aprox. de $290.000).

Extras y Ubicación
• Excelente barrio, sector tranquilo.
• Cercano a la Piscina Municipal de Temporada.
• La propiedad cuenta con planos y certificados de recepción definitiva.

Condiciones de Venta
Pago al contado o vía crédito hipotecario aprobado.

Contacto AYM Propiedades
+56 9 9000 3574 | +56 9 9682 5523
Facebook: AYM Propiedades | Instagram: @alarconymatus.propiedades',
   3, 1, 101, 408, '["/fotos/AM-003/3.VDC2C VAN 1.jpg", "/fotos/AM-003/3.VDC2C VAN 2.jpg", "/fotos/AM-003/3.VDC2C VAN 3.jpg", "/fotos/AM-003/3.VDC2C VAN 4.jpg", "/fotos/AM-003/3.VDC2C VAN 5.jpg", "/fotos/AM-003/3.VDC2C VAN 6.jpg", "/fotos/AM-003/3.VDC2C VAN 7.jpg", "/fotos/AM-003/3.VDC2C VAN 8.jpg", "/fotos/AM-003/3.VDC2C VAN 9.jpg", "/fotos/AM-003/3.VDC2C VAN 10.jpg", "/fotos/AM-003/3.VDC2C VAN 11.jpg", "/fotos/AM-003/3.VDC2C VAN 12.jpg", "/fotos/AM-003/3.VDC2C VAN 13.jpg", "/fotos/AM-003/3.VDC2C VAN 14.jpg", "/fotos/AM-003/3.VDC2C VAN 15.jpg", "/fotos/AM-003/3.VDC2C VAN 16.jpg", "/fotos/AM-003/3.VDC2C VAN 17.jpg", "/fotos/AM-003/3.VDC2C VAN 18.jpg", "/fotos/AM-003/3.VDC2C VAN 19.jpg", "/fotos/AM-003/3.VDC2C VAN 20.jpg", "/fotos/AM-003/3.VDC2C VAN 21.jpg", "/fotos/AM-003/3.VDC2C VAN 22.jpg", "/fotos/AM-003/3.VDC2C VAN 23.jpg", "/fotos/AM-003/3.VDC2C VAN 24.jpg", "/fotos/AM-003/3.VDC2C VAN 25.jpg", "/fotos/AM-003/3.VDC2C VAN 26.jpg", "/fotos/AM-003/3.VDC2C VAN 27.jpg", "/fotos/AM-003/3.VDC2C VAN 28.jpg", "/fotos/AM-003/3.VDC2C VAN 29.jpg", "/fotos/AM-003/3.VDC2C VAN 30.jpg", "/fotos/AM-003/3.VDC2C VAN 31.jpg", "/fotos/AM-003/3.VDC2C VAN 32.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-004', 'VENTA DE EXCELENTE PARCELA EN QUILLOTA – SECTOR SAN PEDRO $150.000.000', 'Venta', 'Parcela', 'Viña del Mar', null, 'Disponible',
   150000000, null, null, 'VENTA DE EXCELENTE PARCELA EN QUILLOTA – SECTOR SAN PEDRO $150.000.000

Precio: $150.000.000
Superficie total: Terreno rectangular con abundante agua y excelente clima
Terreno: 5115 m²
Casa: 60 m²
Producción: Aproximadamente 130 paltos (mayoría variedad Hass) + frutales diversos

Casa principal
60 m² construidos, sólida y muy bien cuidada.
Living comedor con bow window y cortinas roller de madera.
Vigas a la vista en sala y terraza.
2 dormitorios con closet y cortinas (principal con cama matrimonial, TV y veladores).
Cocina concepto abierto con isla de madera y 4 sillas altas.
Encimera a gas, horno eléctrico, campana, refrigerador Mabe con dispensador de agua, vajilla y utensilios incluidos.
Baño completo.
Todas las ventanas y puertas con protecciones metálicas, malla mosquitera y termopanel.
Incluye TV, calefactor, sillones convertibles, puf grande y detalles decorativos.

Exterior y comodidades
Quincho techado con horno semi-industrial (doble parrilla acero inoxidable, 90 cm profundidad) y lavamanos con agua caliente/fría.
Piscina 3,5 x 7 m con borde fulget, bomba, filtros nuevos, clorador y reloj programador.
Sector piscina con deck de madera, reposeras, quitasoles y mobiliario exterior.
Columpio de madera para tres personas.
Casetas:
Calefont y gas (15 kg).
Herramientas.
Pozo (3x5 m) con sistema de riego automatizado, lavamanos y espacio para generador.
Torre con estanque de 1.000 L y bomba de presión.
Generador Hyundai 6500 KW, con caseta y cobertor.
Luz propia con 8 paneles solares, inversor y 4 baterías, con respaldo a generador.
Sistema de cámaras de seguridad (4 puntos), router Wi-Fi y alarma comunitaria.
Iluminación solar autónoma en accesos y caminos interiores.

Producción y cultivos
130 paltos en producción anual (principalmente Hass).

Parrón (uva blanca y negra), maracuyá, golden berries, ciruelo Reina Claudia, naranjo, limón sutil, guayabo, papayo, higuera, chirimoyas, moras, frambuesas, flores y árboles ornamentales.

Pozo profundo entubado (9,5 m) con 3 napas subterráneas activas, bomba sumergible y estanque de 500.000 litros aprox.

Sistema de riego automatizado para 150 aspersores (35 L/h).

Acceso y conectividad
Camino al Pozo, sector tranquilo y seguro.
Rápido acceso hacia Viña del Mar, Santiago y zona norte.
Lugar ideal para vivir o invertir con rentabilidad agrícola.

Oportunidad
Excelente inversión productiva
Casa totalmente equipada
Energía solar y agua en abundancia
Ideal para residencia, descanso o proyecto turístico

Contacto A&M Propiedades
+56 9 9000 3574
+56 9 9682 5523

Facebook: AYM Propiedades
Instagram: @alarconymatus.propiedades',
   null, null, null, null, '["/fotos/AM-004/4.VDEPEQ SSP 1.jpg", "/fotos/AM-004/4.VDEPEQ SSP 2.jpg", "/fotos/AM-004/4.VDEPEQ SSP 3.jpg", "/fotos/AM-004/4.VDEPEQ SSP 4.jpg", "/fotos/AM-004/4.VDEPEQ SSP 5.jpg", "/fotos/AM-004/4.VDEPEQ SSP 6.jpg", "/fotos/AM-004/4.VDEPEQ SSP 7.jpg", "/fotos/AM-004/4.VDEPEQ SSP 8.jpg", "/fotos/AM-004/4.VDEPEQ SSP 9.jpg", "/fotos/AM-004/4.VDEPEQ SSP 10.jpg", "/fotos/AM-004/4.VDEPEQ SSP 11.jpg", "/fotos/AM-004/4.VDEPEQ SSP 12.jpg", "/fotos/AM-004/4.VDEPEQ SSP 13.jpg", "/fotos/AM-004/4.VDEPEQ SSP 14.jpg", "/fotos/AM-004/4.VDEPEQ SSP 15.jpg", "/fotos/AM-004/4.VDEPEQ SSP 16.jpg", "/fotos/AM-004/4.VDEPEQ SSP 17.jpg", "/fotos/AM-004/4.VDEPEQ SSP 18.jpg", "/fotos/AM-004/4.VDEPEQ SSP 19.jpg", "/fotos/AM-004/4.VDEPEQ SSP 20.jpg", "/fotos/AM-004/4.VDEPEQ SSP 21.jpg", "/fotos/AM-004/4.VDEPEQ SSP 22.jpg", "/fotos/AM-004/4.VDEPEQ SSP 23.jpg", "/fotos/AM-004/4.VDEPEQ SSP 24.jpg", "/fotos/AM-004/4.VDEPEQ SSP 25.jpg", "/fotos/AM-004/4.VDEPEQ SSP 26.jpg", "/fotos/AM-004/4.VDEPEQ SSP 27.jpg", "/fotos/AM-004/4.VDEPEQ SSP 28.jpg", "/fotos/AM-004/4.VDEPEQ SSP 29.jpg", "/fotos/AM-004/4.VDEPEQ SSP 30.jpg", "/fotos/AM-004/4.VDEPEQ SSP 31.jpg", "/fotos/AM-004/4.VDEPEQ SSP 32.jpg", "/fotos/AM-004/4.VDEPEQ SSP 33.jpg", "/fotos/AM-004/4.VDEPEQ SSP 34.jpg"]'::jsonb, false)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-005', 'VENDO DEPARTAMENTO EN LIMACHE – CONDOMINIO ALTO SAN FRANCISCO II $80.000.000', 'Venta', 'Departamento', 'Limache', null, 'Disponible',
   80000000, null, null, 'VENDO DEPARTAMENTO EN LIMACHE – CONDOMINIO ALTO SAN FRANCISCO II $80.000.000

Precio: $80.000.000 millones de pesos
Ubicación: Avenida Urmeneta, Limache – Segundo piso
Orientación: Poniente

Características del Departamento
Amplio living comedor
Cocina americana amoblada y equipada con horno y encimera
Logia independiente
Amplio balcón abierto
2 dormitorios con clóset y pisos cerámicos
1 baño completo
Estacionamiento incluido
Gasto común: aprox. $70.000
Excelente iluminación y estado general

Características del Condominio
Acceso controlado y vigilancia 24 horas
Piscinas y áreas verdes
Sala de eventos y juegos infantiles
Entorno tranquilo y bien asoleado

Contacto A&M Propiedades
+56 9 9000 3574
+56 9 9682 5523

Facebook: AYM Propiedades
Instagram: @alarconymatus.propiedades',
   null, null, null, null, '["/fotos/AM-005/5.VDEL CASFII 1.jpg", "/fotos/AM-005/5.VDEL CASFII 2.jpg", "/fotos/AM-005/5.VDEL CASFII 3.jpg", "/fotos/AM-005/5.VDEL CASFII 4.jpg", "/fotos/AM-005/5.VDEL CASFII 5.jpg", "/fotos/AM-005/5.VDEL CASFII 6.jpg", "/fotos/AM-005/5.VDEL CASFII 7.jpg", "/fotos/AM-005/5.VDEL CASFII 8.jpg", "/fotos/AM-005/5.VDEL CASFII 9.jpg", "/fotos/AM-005/5.VDEL CASFII 10.jpg", "/fotos/AM-005/5.VDEL CASFII 11.jpg", "/fotos/AM-005/5.VDEL CASFII 12.jpg", "/fotos/AM-005/5.VDEL CASFII 13.jpg", "/fotos/AM-005/5.VDEL CASFII 14.jpg", "/fotos/AM-005/5.VDEL CASFII 15.jpg", "/fotos/AM-005/5.VDEL CASFII 16.jpg", "/fotos/AM-005/5.VDEL CASFII 17.jpg"]'::jsonb, false)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-006', 'Venta de Casa en Viña del Mar – Recreo/Caleta Barca $145.000.000', 'Venta', 'Casa', 'Viña del Mar', 'Recreo / Caleta Barca, Viña del Mar', 'Disponible',
   145000000, null, 'Casa 2 pisos, 3D/1B. Terreno 84 m². Excelente conectividad a Av. España. Ideal inversión/hospedaje.', 'VENTA DE CASA EN VIÑA DEL MAR - RECREO/CALETA BARCA - $145.000.000

Ubicación: Estratégica en Recreo - Caleta Barca, sector alto con acceso inmediato al centro de Viña del Mar. Acceso directo a Avenida España mediante escaleras.

Precio: $145.000.000
Superficie de terreno: 84 m² (terreno rectangular)
Construcción: Albañilería en ladrillo recubierto en concreto, con paredes y divisiones sólidas.

Características de la Propiedad:
• Construcción del año: 1967
• Casa de 2 pisos

Primer Piso:
• Amplio comedor
• Cocina en buen estado (necesita remodelación)
• Acceso al patio

Segundo Piso:
• 3 dormitorios
• 1 baño
• Corredor con balcón con vista al Cerro Castillo

Ventajas y Oportunidad de Inversión:
• Sector tranquilo y residencial
• Ideal para inversión en hospedaje o turismo
• Construcción sólida, necesita mantención menor
• Cuenta con gas natural
• Excelente conectividad y transporte público a Viña
• Cercano a universidades y colegios
• Pasaje pavimentado con veredas y soleras

¡Se aceptan ofertas! Excelente oportunidad de inversión.

Contacto: +56 9 9000 3574 | +56 9 9682 5523
Facebook: Busca AYM Propiedades | Instagram: @alarconymatus.propiedades',
   3, 1, null, 84, '["/fotos/AM-006/6.VDCEVDM RCB 1.jpg", "/fotos/AM-006/6.VDCEVDM RCB 2.jpg", "/fotos/AM-006/6.VDCEVDM RCB 3.jpg", "/fotos/AM-006/6.VDCEVDM RCB 4.jpg", "/fotos/AM-006/6.VDCEVDM RCB 5.jpg", "/fotos/AM-006/6.VDCEVDM RCB 6.jpg", "/fotos/AM-006/6.VDCEVDM RCB 7.jpg", "/fotos/AM-006/6.VDCEVDM RCB 8.jpg", "/fotos/AM-006/6.VDCEVDM RCB 9.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-007', 'Se Vende Casa en Sector Centro-Sur, Villa Alemana – $110.000.000', 'Venta', 'Casa', 'Villa Alemana', 'Sector Centro-Sur, Villa Alemana', 'Disponible',
   110000000, null, 'Terreno 275 m², construcción 103,5 m². 3D/1B, terraza, patio y construcción adicional con baño.', 'SE VENDE CASA EN SECTOR CENTRO-SUR, VILLA ALEMANA - $110.000.000

Ubicación estratégica: A solo 7 cuadras del centro de Villa Alemana por Maturana. Casa individual con terreno amplio y construcción sólida.

Características de la Propiedad:
• Terreno: 275 m²
• Construcción: 103,5 m² de albañilería de ladrillo
• 3 Dormitorios amplios
• Cocina espaciosa
• 1 Baño principal
• Terraza y patio
• Construcción adicional en el patio con baño
• Estacionamiento para 1 vehículo
• Grandes ventanales que aportan excelente iluminación

Ubicación y conectividad:
• Cercano a colegios y sedicentros
• Rápido acceso a Troncal Sur por Maturana
• A pocos minutos del centro de Villa Alemana

¡Se aceptan ofertas! Contáctanos para más información.

Contacto: +56 9 9000 3574 | +56 9 9682 5523
Facebook: Busca AYM Propiedades | Instagram: @alarconymatus.propiedades',
   3, 1, 103.5, 275, '["/fotos/AM-007/7.SVCESCS VA 1.jpg", "/fotos/AM-007/7.SVCESCS VA 2.jpg", "/fotos/AM-007/7.SVCESCS VA 3.jpg", "/fotos/AM-007/7.SVCESCS VA 4.jpg", "/fotos/AM-007/7.SVCESCS VA 5.jpg", "/fotos/AM-007/7.SVCESCS VA 6.jpg", "/fotos/AM-007/7.SVCESCS VA 7.jpg", "/fotos/AM-007/7.SVCESCS VA 8.jpg", "/fotos/AM-007/7.SVCESCS VA 9.jpg", "/fotos/AM-007/7.SVCESCS VA 10.jpg", "/fotos/AM-007/7.SVCESCS VA 11.jpg", "/fotos/AM-007/7.SVCESCS VA 12.jpg", "/fotos/AM-007/7.SVCESCS VA 13.jpg", "/fotos/AM-007/7.SVCESCS VA 14.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-008', 'Vendo Departamento en Villa Alemana – $51.000.000', 'Venta', 'Departamento', 'Villa Alemana', 'Sector Av. Nueva Hipódromo, Villa Alemana', 'Disponible',
   51000000, null, '3D/1B, living-comedor, cocina con logia, balcón, pisos cerámicos y estacionamiento. GC aprox. $25.000.', 'VENDO DEPARTAMENTO EN VILLA ALEMANA - $51.000.000

Ubicación: Sector Avenida Nueva Hipódromo, Villa Alemana. Condominio cerrado con acceso controlado, ideal para mayor seguridad y tranquilidad.

Características del Departamento:
• 3 dormitorios
• Living - Comedor
• Cocina con amplia logia
• 1 baño completo
• Balcón con vista
• Pisos cerámicos
• Estacionamiento asignado

Gasto común: Aproximadamente $25.000

Ubicación estratégica, cercana a:
• Supermercados • Colegios • Locomoción
• A pocos minutos del acceso a Troncal Sur

¡No pierdas esta oportunidad! Contáctanos para más información.

Contacto: +56 9 9000 3574 | +56 9 9682 5523
Facebook: Busca AYM Propiedades | Instagram: @alarconymatus.propiedades',
   3, 1, null, null, '["/fotos/AM-008/8.VDEVA 1.jpg", "/fotos/AM-008/8.VDEVA 2.jpg", "/fotos/AM-008/8.VDEVA 3.jpg", "/fotos/AM-008/8.VDEVA 4.jpg", "/fotos/AM-008/8.VDEVA 5.jpg", "/fotos/AM-008/8.VDEVA 6.jpg", "/fotos/AM-008/8.VDEVA 7.jpg", "/fotos/AM-008/8.VDEVA 8.jpg", "/fotos/AM-008/8.VDEVA 9.jpg", "/fotos/AM-008/8.VDEVA 10.jpg", "/fotos/AM-008/8.VDEVA 11.jpg", "/fotos/AM-008/8.VDEVA 12.jpg", "/fotos/AM-008/8.VDEVA 13.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-009', 'Se Vende Casa en Barrio Norte, Quilpué – $100.000.000', 'Venta', 'Casa', 'Quilpué', 'Barrio Norte, Quilpué', 'Disponible',
   100000000, null, 'Terreno 250 m², construcción ~110 m². 3D/1B, un piso, bodega y ampliación. A pasos de plaza, estación y servicios.', 'SE VENDE CASA EN BARRIO NORTE, QUILPUÉ - $100.000.000 CLP

Ubicación: Privilegiada en un sector de alta plusvalía en Quilpué, a pasos de la plaza, municipalidad, estación de tren, supermercados y colegios. Ideal para vivir o invertir.

Terreno: 250 m² • Construcción: 110 m² aprox.
Dormitorios: 3 • Baños: 1 • Estacionamiento: Factibilidad

Distribución:
• Hall de acceso
• Living - Comedor
• Sala de estar
• Cocina
• Logia
• Ampliación en patio posterior
• Bodega en el patio

Casa de un piso, construcción en madera y adobillo, con una vista privilegiada hacia el oriente.

¡Se aceptan ofertas! Contáctanos para más información.

Contacto: +56 9 9000 3574 | +56 9 9682 5523
Facebook: Busca AYM Propiedades | Instagram: @alarconymatus.propiedades',
   3, 1, 110, 250, '["/fotos/AM-009/9.SVCEBNQ 1.jpg", "/fotos/AM-009/9.SVCEBNQ 2.jpg", "/fotos/AM-009/9.SVCEBNQ 3.jpg", "/fotos/AM-009/9.SVCEBNQ 4.jpg", "/fotos/AM-009/9.SVCEBNQ 5.jpg", "/fotos/AM-009/9.SVCEBNQ 6.jpg", "/fotos/AM-009/9.SVCEBNQ 7.jpg", "/fotos/AM-009/9.SVCEBNQ 8.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-010', 'Vendo Parcela en Los Coligües, Quilpué – $135.000.000', 'Venta', 'Parcela', 'Quilpué', 'Los Coligües, Quilpué', 'Disponible',
   135000000, null, 'Terreno 9.186 m². Casa 75 m² (3D), piscina, quincho, bodegas, 2 pozos, viñedos y frutales. Paneles solares.', 'VENDO LINDA PARCELA EN LOS COLIGÜES, QUILPUÉ - $135.000.000

Terreno: 9.186 m² (casi 1 hectárea) | Casa: 75 m² (3 dormitorios)

Características Destacadas:
• Terreno plano con leve inclinación al fondo
• Casa: Living-comedor, cocina, baño; ventanas de aluminio y pisos cerámicos
• Instalaciones adicionales: Bodega y taller de herramientas, quincho amplio con hornos y asaderas, gran piscina y sector para reuniones, 2 pozos de agua

Naturaleza y Producción:
• Viñedos y árboles frutales: Limones, naranjas, paltos, damascos, perales, higueras, almendros, granados, olivos, tunares, ciruelas, duraznos, frambuesas y moras. Árboles nativos y jardines (hortensias, rosas y más)

Servicios:
• Electricidad con medidor de luz
• Paneles solares para ahorro energético
• Sector tranquilo, ideal para desconectarse

¡No pierdas esta oportunidad! Contáctanos para más información.

Contacto: +56 9 9000 3574 | +56 9 9682 5523
Facebook: Busca AYM Propiedades | Instagram: @alarconymatus.propiedades',
   3, 1, 75, 9186, '["/fotos/AM-010/10.VLPELQ 1.jpg", "/fotos/AM-010/10.VLPELQ 2.jpg", "/fotos/AM-010/10.VLPELQ 3.jpg", "/fotos/AM-010/10.VLPELQ 4.jpg", "/fotos/AM-010/10.VLPELQ 5.jpg", "/fotos/AM-010/10.VLPELQ 6.jpg", "/fotos/AM-010/10.VLPELQ 7.jpg", "/fotos/AM-010/10.VLPELQ 8.jpg", "/fotos/AM-010/10.VLPELQ 9.jpg", "/fotos/AM-010/10.VLPELQ 10.jpg", "/fotos/AM-010/10.VLPELQ 11.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-011', 'Vendo Departamento en Viña del Mar – UF 3.200 (≈ $126.000.000)', 'Venta', 'Departamento', 'Viña del Mar', 'Calle Arlegui, Viña del Mar', 'Disponible',
   null, 3200, '2D/1B, 70 m², año 1985. Calle Arlegui. Conserjería. GC ~$60.000. Estac. opcional $40.000/mes.', 'VENDO DEPARTAMENTO EN VIÑA DEL MAR - UF 3.200 (aprox. $126.000.000)
Excelente oportunidad para inversión en renta. Ubicado en segundo piso, con orientación poniente y vista hacia Cerro Castillo.

Dirección: Calle Arlegui, entre Ecuador y Von Schroeder
Superficie: 70 m² construidos | Año: 1985

Características:
• Amplio living comedor con salida a terraza
• 2 dormitorios con closet
• 1 baño completo con instalación para lavadora
• Cocina tradicional amoblada y equipada (cocina, refrigerador, horno microondas)
• Piso flotante en excelente estado
• Citófono, sensor de acceso peatonal y acceso vehicular
• Conserjería y buen nivel de mantención general
• Gasto común: ~$60.000
• Estacionamiento opcional: $40.000 mensuales

Se vende amoblado o sin muebles. Incluye: Mesa comedor 6 sillas (cubierta vidrio negro), mueble librero, futón + 2 sillones, mesa de centro, alfombra y televisor, 2 camas de 1 plaza con velador y lámpara, 1 cama de 2 plazas con colchón, 2 veladores adicionales, lámparas, cuadros y espejos decorativos.

Contacto AYM Propiedades: +56 9 9000 3574 | +56 9 9682 5523
Facebook: AYM Propiedades | Instagram: @alarconymatus.propiedades',
   2, 1, 70, null, '["/fotos/AM-011/IMG-20251106-WA0006.jpg", "/fotos/AM-011/IMG-20251106-WA0007.jpg", "/fotos/AM-011/IMG-20251106-WA0008.jpg", "/fotos/AM-011/IMG-20251106-WA0009.jpg", "/fotos/AM-011/IMG-20251106-WA0010.jpg", "/fotos/AM-011/IMG-20251106-WA0011.jpg", "/fotos/AM-011/IMG-20251106-WA0012.jpg", "/fotos/AM-011/IMG-20251106-WA0013.jpg", "/fotos/AM-011/IMG-20251106-WA0014.jpg", "/fotos/AM-011/IMG-20251106-WA0015.jpg", "/fotos/AM-011/IMG-20251106-WA0016.jpg", "/fotos/AM-011/IMG-20251106-WA0017.jpg", "/fotos/AM-011/IMG-20251106-WA0018.jpg", "/fotos/AM-011/IMG-20251106-WA0019.jpg", "/fotos/AM-011/IMG-20251106-WA0020.jpg", "/fotos/AM-011/IMG-20251106-WA0021.jpg", "/fotos/AM-011/IMG-20251106-WA0022.jpg", "/fotos/AM-011/IMG-20251106-WA0023.jpg", "/fotos/AM-011/IMG-20251106-WA0024.jpg", "/fotos/AM-011/IMG-20251106-WA0025.jpg", "/fotos/AM-011/IMG-20251106-WA0026.jpg", "/fotos/AM-011/IMG-20251106-WA0027.jpg", "/fotos/AM-011/IMG-20251106-WA0028.jpg", "/fotos/AM-011/IMG-20251106-WA0029.jpg", "/fotos/AM-011/IMG-20251106-WA0030.jpg", "/fotos/AM-011/IMG-20251106-WA0031.jpg", "/fotos/AM-011/IMG-20251106-WA0032.jpg", "/fotos/AM-011/IMG-20251106-WA0033.jpg", "/fotos/AM-011/IMG-20251106-WA0034.jpg", "/fotos/AM-011/IMG-20251106-WA0035.jpg", "/fotos/AM-011/IMG-20251106-WA0036.jpg", "/fotos/AM-011/IMG-20251106-WA0037.jpg", "/fotos/AM-011/IMG-20251106-WA0038.jpg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-012', 'ARRIENDO CASA NUEVA – VILLA ALEMANA CENTRO – $550.000', 'Arriendo', 'Casa', 'Villa Alemana', null, 'Disponible',
   550000, null, null, 'ARRIENDO CASA NUEVA – VILLA ALEMANA CENTRO – $550.000
Pagina web: alarconymatuspropiedades.cl

Ubicación: Centro de Villa Alemana, a media cuadra de supermercados, comercio, locomoción, colegios y estación de Metrotren. Sector tranquilo y residencial.

Canon de arriendo: $530.000
Mes de garantía: $530.000
Comisión de corretaje: 50% del canon de arriendo
No se aceptan mascotas.

Características de la propiedad:

Casa nueva

75 m² construidos

120 m² de terreno

3 dormitorios

1 baño con ducha y vanitorio

Amplio living-comedor

Cocina con lavaplatos

Logia

Patio interior y patio lateral

Antejardín con rosas

Estacionamiento

Pisos cerámicos en toda la casa

Requisitos:

Ingresos líquidos mínimos de $1.800.000

Presentar liquidaciones de sueldo y otros documentos

Codeudor solidario

Considerar mes de arriendo, mes de garantía y comisión de corretaje

Contacto:
+56 9 9000 3574
+56 9 9682 5523

Más información en nuestras redes sociales:
Facebook: Busca AYM Propiedades
Instagram: @alarconymatus.propiedades',
   null, null, null, null, '["/fotos/AM-012/AM-012-01.jpg", "/fotos/AM-012/AM-012-02.jpg", "/fotos/AM-012/AM-012-03.jpg", "/fotos/AM-012/AM-012-04.jpg", "/fotos/AM-012/AM-012-05.jpg", "/fotos/AM-012/AM-012-06.jpg", "/fotos/AM-012/AM-012-07.jpg", "/fotos/AM-012/AM-012-08.jpg", "/fotos/AM-012/AM-012-09.jpg", "/fotos/AM-012/AM-012-10.jpg", "/fotos/AM-012/AM-012-11.jpg", "/fotos/AM-012/AM-012-12.jpg", "/fotos/AM-012/AM-012-13.jpg", "/fotos/AM-012/AM-012-14.jpg"]'::jsonb, false)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-013', 'Arriendo Local Comercial en Quilpué – $600.000', 'Arriendo', 'Local Comercial', 'Quilpué', 'Calle Los Nardos, Quilpué', 'Disponible',
   600000, null, 'Local comercial de 45 m² habilitado para carnicería. Excelente ubicación en calle Los Nardos.', 'ARRIENDO LOCAL COMERCIAL – QUILPUÉ – $600.000
Página web: alarconymatuspropiedades.cl

Se arrienda local comercial ubicado en calle Los Nardos, cerca de la avenida principal de Marga Marga, en Quilpué. Excelente ubicación comercial.

El local se encuentra habilitado para funcionamiento de carnicería, minimarket u otro giro que no involucre cocina o preparaciones. Cuenta con el espacio necesario, instalación eléctrica y construcción regularizada.

Características:

- Baño
- Protecciones metálicas
- Portón metálico de seguridad

Local bien ubicado y listo para funcionar.

Canon de arriendo: $600.000

Requisitos:

- Demostrar ingresos aproximados de $2.400.000
- Presentar documentación correspondiente
- Considerar mes de arriendo, mes de garantía y comisión de corretaje

Contacto:
+56 9 9000 3574
+56 9 9682 5523

Más información en nuestras redes sociales:
Facebook: AYM Propiedades
Instagram: @alarconymatus.propiedades',
   null, 1, 45, null, '["/fotos/AM-013/AM-013-01.jpeg", "/fotos/AM-013/AM-013-02.jpeg", "/fotos/AM-013/AM-013-03.jpeg", "/fotos/AM-013/AM-013-08.jpeg", "/fotos/AM-013/AM-013-09.jpeg", "/fotos/AM-013/AM-013-11.jpeg", "/fotos/AM-013/AM-013-14.jpeg"]'::jsonb, true)
on conflict (codigo) do nothing;

insert into public.propiedades
  (codigo, title, operation, type, commune, address, status,
   price_clp, price_uf, summary, description,
   bedrooms, bathrooms, surface, terrain, images, visible)
values
  ('AM-014', 'Arriendo Casa en Belloto 2000, Quilpué – $600.000', 'Arriendo', 'Casa', 'Quilpué', 'Belloto 2000, Quilpué', 'Disponible',
   600000, null, 'Casa 2 pisos en Belloto 2000. 4D/2B, estufa a leña, walk-in closet, patio y estacionamiento. Excelente conectividad.', 'ARRIENDO CASA EN BELLOTO 2000 – QUILPUÉ – $600.000
Pagina web: alarconymatuspropiedades.cl

Se arrienda linda casa ubicada en Belloto 2000, comuna de Quilpué. Excelente sector residencial, a pasos de Portal Belloto, feria, colegios, supermercados Jumbo, Líder, Santa Isabel, Easy y Homecenter.

Cuenta con excelente conectividad y locomoción por Avenida Centenario, Troncal y conexión a Troncal Sur por Avenida Marga Marga.

Características de la propiedad:

Primer piso:

* Amplio living comedor muy iluminado
* Estufa a leña
* Amplia cocina comedor amoblada con acceso a patio posterior
* Dos dormitorios con clóset
* Amplio baño

Segundo piso:

* Escala de madera cómoda y bien iluminada
* Amplio dormitorio matrimonial con sala de baño y walk-in closet
* Dormitorio adicional con clóset

Otros:

* Pisos flotantes en dormitorios
* Cerámicos en cocina y baños
* Estacionamiento
* Ampliaciones regularizadas
* Excelente estado general

Canon de arriendo: $550.000

Contacto:
+56 9 9000 3574
+56 9 9682 5523

Facebook: AYM Propiedades
Instagram: @alarconymatus.propiedades
Pagina web: alarconymatuspropiedades.cl',
   4, 2, null, null, '["/fotos/AM-014/AM-014-01.jpeg", "/fotos/AM-014/AM-014-02.jpeg", "/fotos/AM-014/AM-014-03.jpeg", "/fotos/AM-014/AM-014-04.jpeg", "/fotos/AM-014/AM-014-05.jpeg", "/fotos/AM-014/AM-014-06.jpeg", "/fotos/AM-014/AM-014-07.jpeg", "/fotos/AM-014/AM-014-08.jpeg", "/fotos/AM-014/AM-014-09.jpeg", "/fotos/AM-014/AM-014-10.jpeg", "/fotos/AM-014/AM-014-11.jpeg", "/fotos/AM-014/AM-014-12.jpeg", "/fotos/AM-014/AM-014-13.jpeg", "/fotos/AM-014/AM-014-15.jpeg", "/fotos/AM-014/AM-014-16.jpeg", "/fotos/AM-014/AM-014-17.jpeg", "/fotos/AM-014/AM-014-18.jpeg", "/fotos/AM-014/AM-014-19.jpeg"]'::jsonb, true)
on conflict (codigo) do nothing;

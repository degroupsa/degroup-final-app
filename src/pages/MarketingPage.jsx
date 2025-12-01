import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, storage } from '../firebase/config.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './MarketingPage.module.css';
import { FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';

// --- IMPORTAR EDITOR DE TEXTO ---
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// 1. Configuración para Bloques de Texto (Descripciones)
const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'header': [1, 2, 3, false] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ],
};

// 2. Configuración para Títulos (Simple)
const titleModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }], 
    ['clean']
  ],
};

const PageEditorModal = ({ data, onSave, onClose }) => {
  // Estados Texto
  const [heroTitle, setHeroTitle] = useState(data.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(data.heroSubtitle || '');
  const [introTitle, setIntroTitle] = useState(data.introTitle || '');
  const [introText, setIntroText] = useState(data.introText || '');
  const [featuresTitle, setFeaturesTitle] = useState(data.featuresTitle || 'Datos Clave');
  const [featuresList, setFeaturesList] = useState(data.featuresList || []); 
  
  // Estados Archivos (Nuevos)
  const [heroFile, setHeroFile] = useState(null);
  const [introFile, setIntroFile] = useState(null);
  const [featuresBgFile, setFeaturesBgFile] = useState(null);

  // --- ESTADOS DE PREVISUALIZACIÓN (CORRECCIÓN) ---
  // Cargamos la imagen existente al iniciar
  const [heroPreview, setHeroPreview] = useState(data.heroImageUrl || '');
  const [introPreview, setIntroPreview] = useState(data.introImageUrl || '');
  const [featuresBgPreview, setFeaturesBgPreview] = useState(data.featuresBgUrl || '');

  const [loading, setLoading] = useState(false);

  // Handlers para Features
  const handleAddFeature = () => {
    setFeaturesList([...featuresList, { data: '100%', label: 'Nuevo', title: 'Título', desc: 'Descripción...' }]);
  };
  const handleRemoveFeature = (index) => {
    const newList = [...featuresList];
    newList.splice(index, 1);
    setFeaturesList(newList);
  };
  const handleFeatureChange = (index, field, value) => {
    const newList = [...featuresList];
    newList[index][field] = value;
    setFeaturesList(newList);
  };

  // Handlers para Imágenes (Actualizan archivo y vista previa)
  const handleHeroImageChange = (e) => {
      if (e.target.files[0]) {
          setHeroFile(e.target.files[0]);
          setHeroPreview(URL.createObjectURL(e.target.files[0]));
      }
  };
  const handleIntroImageChange = (e) => {
      if (e.target.files[0]) {
          setIntroFile(e.target.files[0]);
          setIntroPreview(URL.createObjectURL(e.target.files[0]));
      }
  };
  const handleFeaturesBgChange = (e) => {
      if (e.target.files[0]) {
          setFeaturesBgFile(e.target.files[0]);
          setFeaturesBgPreview(URL.createObjectURL(e.target.files[0]));
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const newData = { 
        heroTitle, heroSubtitle, 
        introTitle, introText,
        featuresTitle, featuresList 
    };
    await onSave(newData, heroFile, introFile, featuresBgFile);
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Editar Página</h2>
        <form onSubmit={handleSubmit}>
            
            {/* HERO */}
            <div className={styles.sectionBlock}>
                <h4>1. Cabecera (Hero)</h4>
                <div className={styles.formGroup}>
                    <label>Título Principal:</label>
                    <ReactQuill theme="snow" value={heroTitle} onChange={setHeroTitle} modules={titleModules} />
                </div>
                <div className={styles.formGroup}>
                    <label>Subtítulo:</label>
                    <ReactQuill theme="snow" value={heroSubtitle} onChange={setHeroSubtitle} modules={titleModules} />
                </div>
                <div className={styles.formGroup}>
                    <label>Imagen de Fondo:</label>
                    <input type="file" onChange={handleHeroImageChange} accept="image/*" />
                    {/* VISTA PREVIA */}
                    {heroPreview && (
                        <div style={{marginTop:'10px', border:'1px solid #ddd', padding:'5px', borderRadius:'5px'}}>
                            <p style={{margin:'0 0 5px 0', fontSize:'0.8rem', color:'#666'}}>Imagen Actual / Seleccionada:</p>
                            <img src={heroPreview} alt="Preview Hero" style={{maxWidth:'100%', height:'150px', objectFit:'cover', borderRadius:'4px'}} />
                        </div>
                    )}
                </div>
            </div>

            {/* INTRO */}
            <div className={styles.sectionBlock}>
                <h4>2. Introducción</h4>
                <div className={styles.formGroup}>
                    <label>Título Sección:</label>
                    <ReactQuill theme="snow" value={introTitle} onChange={setIntroTitle} modules={titleModules} />
                </div>
                <div className={styles.formGroup}>
                    <label>Texto Descriptivo:</label>
                    <ReactQuill theme="snow" value={introText} onChange={setIntroText} modules={quillModules} />
                </div>
                <div className={styles.formGroup}>
                    <label>Imagen Lateral:</label>
                    <input type="file" onChange={handleIntroImageChange} accept="image/*" />
                    {/* VISTA PREVIA */}
                    {introPreview && (
                        <div style={{marginTop:'10px', border:'1px solid #ddd', padding:'5px', borderRadius:'5px'}}>
                             <p style={{margin:'0 0 5px 0', fontSize:'0.8rem', color:'#666'}}>Imagen Actual / Seleccionada:</p>
                            <img src={introPreview} alt="Preview Intro" style={{maxWidth:'150px', height:'auto', borderRadius:'4px'}} />
                        </div>
                    )}
                </div>
            </div>

            {/* FEATURES */}
            <div className={styles.sectionBlock}>
                <h4>3. Datos Clave</h4>
                <div className={styles.formGroup}>
                    <label>Título Sección:</label>
                    <ReactQuill theme="snow" value={featuresTitle} onChange={setFeaturesTitle} modules={titleModules} />
                </div>
                <div className={styles.formGroup}>
                    <label>Fondo (Opcional):</label>
                    <input type="file" onChange={handleFeaturesBgChange} accept="image/*" />
                    {/* VISTA PREVIA */}
                    {featuresBgPreview && (
                        <div style={{marginTop:'10px', border:'1px solid #ddd', padding:'5px', borderRadius:'5px'}}>
                             <p style={{margin:'0 0 5px 0', fontSize:'0.8rem', color:'#666'}}>Fondo Actual / Seleccionado:</p>
                            <img src={featuresBgPreview} alt="Preview BG" style={{maxWidth:'100%', height:'100px', objectFit:'cover', borderRadius:'4px'}} />
                        </div>
                    )}
                </div>
                
                <label style={{fontWeight:'bold', display:'block', marginBottom:'10px'}}>Lista de Puntos:</label>
                {featuresList.map((item, index) => (
                    <div key={index} className={styles.featureRow}>
                        <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                            <input placeholder="Dato (ej: 100%)" value={item.data} onChange={e => handleFeatureChange(index, 'data', e.target.value)} className={styles.inputSimple} style={{width:'40%'}} />
                            <input placeholder="Etiqueta" value={item.label} onChange={e => handleFeatureChange(index, 'label', e.target.value)} className={styles.inputSimple} style={{width:'60%'}} />
                        </div>
                        <input placeholder="Título del punto" value={item.title} onChange={e => handleFeatureChange(index, 'title', e.target.value)} className={styles.inputSimple} style={{marginBottom:'5px'}} />
                        <textarea placeholder="Descripción" value={item.desc} onChange={e => handleFeatureChange(index, 'desc', e.target.value)} className={styles.inputSimple} rows={2} />
                        <button type="button" onClick={() => handleRemoveFeature(index)} className={styles.deleteBtn}>Eliminar</button>
                    </div>
                ))}
                <button type="button" onClick={handleAddFeature} className={styles.addBtn}>+ Agregar Punto</button>
            </div>

            <div className={styles.modalActions}>
                <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancelar</button>
                <button type="submit" disabled={loading} className={styles.saveBtn}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </form>
      </div>
    </div>
  );
};

function MarketingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'gestion');
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'marketing_pages', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setPageData(docSnap.data());
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleSave = async (newData, heroFile, introFile, featuresBgFile) => {
    try {
        let updates = { ...newData };
        
        // Subida de imágenes solo si hay archivo nuevo
        if (heroFile) {
            const refH = ref(storage, `marketing/${id}_hero_${Date.now()}`);
            await uploadBytes(refH, heroFile);
            updates.heroImageUrl = await getDownloadURL(refH);
        }
        if (introFile) {
            const refI = ref(storage, `marketing/${id}_intro_${Date.now()}`);
            await uploadBytes(refI, introFile);
            updates.introImageUrl = await getDownloadURL(refI);
        }
        if (featuresBgFile) {
            const refF = ref(storage, `marketing/${id}_features_bg_${Date.now()}`);
            await uploadBytes(refF, featuresBgFile);
            updates.featuresBgUrl = await getDownloadURL(refF);
        }

        const docRef = doc(db, 'marketing_pages', id);
        await updateDoc(docRef, updates);
        
        // Actualizamos estado local para ver cambios sin recargar
        setPageData(prev => ({ ...prev, ...updates }));
        setIsEditing(false);
        toast.success("Actualizado correctamente");
    } catch (error) { 
        console.error(error); 
        toast.error("Error al guardar"); 
    }
  };

  if (loading) return <div style={{padding:'4rem', textAlign:'center'}}>Cargando...</div>;
  if (!pageData) return <div style={{padding:'4rem', textAlign:'center'}}>Página no encontrada.</div>;

  const featuresStyle = pageData.featuresBgUrl ? {
      backgroundImage: `url(${pageData.featuresBgUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
  } : { backgroundColor: '#343A40' };

  return (
    <div className={styles.pageContainer}>
      {isAdmin && <button className={styles.adminEditBtn} onClick={() => setIsEditing(true)}><FaEdit /> Editar Página</button>}
      
      {isEditing && <PageEditorModal data={pageData} onSave={handleSave} onClose={() => setIsEditing(false)} />}

      {/* --- 1. HERO SECTION --- */}
      <section className={styles.heroSection} style={{ backgroundImage: `url(${pageData.heroImageUrl || 'https://via.placeholder.com/1920x800'})` }}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
            <h1 className={styles.heroTitle} dangerouslySetInnerHTML={{ __html: pageData.heroTitle }} />
            <div className={styles.heroSubtitle} dangerouslySetInnerHTML={{ __html: pageData.heroSubtitle }} />
        </div>
      </section>

      {/* --- 2. INTRODUCCIÓN --- */}
      <section className={styles.introSection}>
        <div className={styles.introText}>
            <h2 dangerouslySetInnerHTML={{ __html: pageData.introTitle }} />
            <div dangerouslySetInnerHTML={{ __html: pageData.introText }} />
        </div>
        <div className={styles.introImage}>
            {pageData.introImageUrl && <img src={pageData.introImageUrl} alt="Intro" />}
        </div>
      </section>

      {/* --- 3. FEATURES (DATOS CLAVE) --- */}
      <section className={styles.featuresSection} style={featuresStyle}>
        {pageData.featuresBgUrl && <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:1}}></div>}
        
        <div className={styles.featuresContainer} style={{position:'relative', zIndex:2}}>
            <div className={styles.featuresHeader}>
                <h2 dangerouslySetInnerHTML={{ __html: pageData.featuresTitle || "Datos Clave" }} />
            </div>
            
            <div className={styles.featureList}>
                {(pageData.featuresList || []).map((item, index) => (
                    <div key={index} className={styles.featureItem}>
                        <div className={styles.featureData}>{item.data} <span>{item.label}</span></div>
                        <div className={styles.featureDescription}>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>
    </div>
  );
}

export default MarketingPage;
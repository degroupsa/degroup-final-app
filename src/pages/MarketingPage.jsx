import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, storage } from '../firebase/config.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './MarketingPage.module.css';
import { FaEdit, FaTrash, FaPlus, FaChevronLeft, FaChevronRight, FaYoutube, FaArrowUp, FaArrowDown, FaCog } from 'react-icons/fa';
import toast from 'react-hot-toast';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// --- HELPERS ---
const getYoutubeId = (url) => {
    if (!url) return null;
    // Soporta: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    // Los IDs de Youtube suelen tener 11 caracteres
    return (match && match[2].length === 11) ? match[2] : null;
};

const quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ 'header': [1, 2, 3, false] }], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']] };
const titleModules = { toolbar: [['bold', 'italic', 'underline'], [{ 'color': [] }], ['clean']] };

// --- COMPONENTE: EDITOR DE LISTA MULTIMEDIA (CORREGIDO) ---
const MediaManager = ({ label, mediaList, setMediaList }) => {
    const [newType, setNewType] = useState('image');
    const [newUrl, setNewUrl] = useState('');
    const [newFile, setNewFile] = useState(null);

    // Detección de calidad de imagen
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && newType === 'image') {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            img.onload = () => {
                if (img.width < 1000) {
                    toast('⚠️ Imagen pequeña (' + img.width + 'px).', {
                        icon: '📉',
                        style: { borderRadius: '10px', background: '#333', color: '#fff' }
                    });
                } else {
                    toast.success(`Calidad: ${img.width}px`);
                }
            };
        }
        setNewFile(file);
    };

    const handleAdd = () => {
        // VALIDACIÓN DE YOUTUBE
        if (newType === 'youtube') {
            if (!newUrl) return toast.error("Ingresa el link");
            const id = getYoutubeId(newUrl);
            if (!id) return toast.error("Link inválido. Asegúrate de copiarlo bien.");
        }
        
        // VALIDACIÓN DE ARCHIVO
        if ((newType === 'image' || newType === 'video') && !newFile) return toast.error("Selecciona archivo");

        const newItem = {
            type: newType,
            url: newType === 'youtube' ? newUrl : URL.createObjectURL(newFile),
            file: newFile,
            id: Date.now()
        };
        setMediaList([...mediaList, newItem]);
        
        // RESETEAR ESTADOS
        setNewFile(null); 
        setNewUrl('');
        
        // Limpiar input file visualmente
        const fileInput = document.getElementById(`fileParams-${label}`);
        if(fileInput) fileInput.value = "";
    };

    const handleRemove = (index) => {
        const list = [...mediaList];
        list.splice(index, 1);
        setMediaList(list);
    };

    return (
        <div className={styles.formGroup} style={{border:'1px dashed #ccc', padding:10, borderRadius:8, background:'#fff'}}>
            <label style={{fontWeight:'bold', fontSize:'0.85rem'}}>{label}</label>
            <div style={{display:'flex', gap:10, overflowX:'auto', paddingBottom:5, marginBottom:5}}>
                {mediaList.map((item, i) => (
                    <div key={i} style={{position:'relative', minWidth:80, maxWidth:80, height:60, background:'#ddd', borderRadius:4, overflow:'hidden', border:'1px solid #eee'}}>
                        <button type="button" onClick={() => handleRemove(i)} style={{position:'absolute', top:0, right:0, background:'red', color:'white', border:'none', cursor:'pointer', zIndex:10, fontSize:10}}>×</button>
                        {item.type === 'image' && <img src={item.url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="preview" />}
                        {item.type === 'video' && <video src={item.url} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
                        {item.type === 'youtube' && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'white'}}><FaYoutube size={24}/></div>}
                    </div>
                ))}
                {mediaList.length === 0 && <span style={{fontSize:'0.7rem', color:'#999'}}>Sin archivos</span>}
            </div>
            
            <div style={{display:'flex', gap:5}}>
                <select value={newType} onChange={e => { setNewType(e.target.value); setNewFile(null); setNewUrl(''); }} style={{width:'80px', fontSize:'0.8rem'}}>
                    <option value="image">Img</option>
                    <option value="video">Vid</option>
                    <option value="youtube">YT</option>
                </select>
                
                {/* SOLUCIÓN AL ERROR DE CONSOLA: AGREGAR KEYS DIFERENTES */}
                {newType === 'youtube' ? 
                    <input 
                        key="input-yt" 
                        value={newUrl} 
                        onChange={e => setNewUrl(e.target.value)} 
                        placeholder="Pegar link de YouTube..." 
                        style={{flex:1}} 
                    /> : 
                    <input 
                        key="input-file"
                        id={`fileParams-${label}`} 
                        type="file" 
                        onChange={handleFileChange} 
                        accept={newType==='video'?"video/*":"image/*"} 
                        style={{flex:1}} 
                    />
                }
                <button type="button" onClick={handleAdd} style={{background:'#28a745', color:'white', border:'none', padding:'2px 8px', borderRadius:4}}><FaPlus/></button>
            </div>
        </div>
    );
};

// --- COMPONENTE: VISUALIZADOR CARRUSEL (MEJORADO) ---
const MediaCarousel = ({ mediaList, isHero = false, height = '300px', fit = 'cover', pos = 'center' }) => {
    const [current, setCurrent] = useState(0);
    const length = mediaList?.length || 0;

    useEffect(() => {
        if (!isHero || length <= 1) return;
        const timer = setInterval(() => setCurrent(c => (c === length - 1 ? 0 : c + 1)), 6000);
        return () => clearInterval(timer);
    }, [length, isHero]);

    const next = () => setCurrent(c => (c === length - 1 ? 0 : c + 1));
    const prev = () => setCurrent(c => (c === 0 ? length - 1 : c - 1));

    if (!mediaList || length === 0) return isHero ? <div style={{width:'100%', height:'100%', background:'#333'}}/> : null;

    const item = mediaList[current];
    const vidId = getYoutubeId(item.url);

    const contentStyle = {
        width:'100%', 
        height:'100%', 
        objectFit: fit, 
        objectPosition: pos, 
        position:'absolute', top:0, left:0,
        imageRendering: 'auto',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
    };

    return (
        <div style={{position: isHero ? 'absolute' : 'relative', top:0, left:0, width:'100%', height: isHero ? '100%' : height, overflow:'hidden', background:'#000'}}>
            {item.type === 'youtube' ? (
                vidId ? (
                    <iframe 
                        src={`https://www.youtube.com/embed/${vidId}?autoplay=${isHero?1:0}&mute=${isHero?1:0}&controls=1&rel=0`} 
                        frameBorder="0" 
                        allowFullScreen 
                        style={contentStyle}
                        title="YouTube video"
                    ></iframe>
                ) : (
                    <div style={{...contentStyle, display:'flex', alignItems:'center', justifyContent:'center', color:'white', flexDirection:'column'}}>
                        <FaYoutube size={40} />
                        <p>Video no disponible</p>
                    </div>
                )
            ) : item.type === 'video' ? (
                <video src={item.url} controls={!isHero} autoPlay={isHero} muted={isHero} loop={isHero} style={contentStyle} />
            ) : (
                <img src={item.url} alt="Media" style={contentStyle} />
            )}
            
            {length > 1 && (
                <>
                    <button onClick={prev} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', zIndex:10}}><FaChevronLeft/></button>
                    <button onClick={next} style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', zIndex:10}}><FaChevronRight/></button>
                </>
            )}
        </div>
    );
};

// --- EDITOR PRINCIPAL ---
const PageEditorModal = ({ data, onSave, onClose }) => {
  const [heroTitle, setHeroTitle] = useState(data.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(data.heroSubtitle || '');
  const [heroMedia, setHeroMedia] = useState(data.heroMedia || []);
  
  const [sections, setSections] = useState(data.sections || []);
  const [loading, setLoading] = useState(false);

  // GESTIÓN DE SECCIONES
  const addSection = (type) => {
      const newSection = {
          id: Date.now(),
          type: type, 
          title: '',
          text: '',
          media: [],
          imgHeight: 400,
          imgFit: 'cover',
          imgPos: 'center',
          featuresList: [], 
          bgFile: null,     
          bgUrl: ''
      };
      if (type === 'features') {
          newSection.featuresList = [{data:'+10', label:'Ejemplo', title:'Título', desc:'Descripción'}];
      }
      setSections([...sections, newSection]);
  };

  const removeSection = (index) => {
      if(!confirm("¿Eliminar sección?")) return;
      const list = [...sections];
      list.splice(index, 1);
      setSections(list);
  };

  const moveSection = (index, direction) => {
      if ((direction === -1 && index === 0) || (direction === 1 && index === sections.length - 1)) return;
      const list = [...sections];
      [list[index], list[index + direction]] = [list[index + direction], list[index]];
      setSections(list);
  };

  const updateSection = (index, field, value) => {
      const list = [...sections];
      list[index][field] = value;
      setSections(list);
  };

  // GESTIÓN FEATURES
  const updateFeatureItem = (secIndex, featIndex, field, value) => {
      const list = [...sections];
      list[secIndex].featuresList[featIndex][field] = value;
      setSections(list);
  };
  const addFeatureItem = (secIndex) => {
      const list = [...sections];
      list[secIndex].featuresList.push({data:'', label:'', title:'', desc:''});
      setSections(list);
  };
  const removeFeatureItem = (secIndex, featIndex) => {
      const list = [...sections];
      list[secIndex].featuresList.splice(featIndex, 1);
      setSections(list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ heroTitle, heroSubtitle, heroMedia, sections });
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay}><div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Editor de Página</h2>
        <form onSubmit={handleSubmit} style={{maxHeight:'80vh', overflowY:'auto', paddingRight:5}}>
            
            {/* HERO */}
            <div className={styles.sectionBlock} style={{borderLeft:'4px solid gold'}}>
                <h4>1. Portada (Hero)</h4>
                <MediaManager label="Galería de Portada" mediaList={heroMedia} setMediaList={setHeroMedia} />
                <div className={styles.formGroup}><label>Título:</label><ReactQuill theme="snow" value={heroTitle} onChange={setHeroTitle} modules={titleModules} /></div>
                <div className={styles.formGroup}><label>Subtítulo:</label><ReactQuill theme="snow" value={heroSubtitle} onChange={setHeroSubtitle} modules={titleModules} /></div>
            </div>

            {/* SECCIONES DINÁMICAS */}
            {sections.map((sec, index) => (
                <div key={sec.id} className={styles.sectionBlock} style={{position:'relative', marginTop:20}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, borderBottom:'1px solid #eee', paddingBottom:5}}>
                        <h4 style={{margin:0}}>Sección {index + 2}: {sec.type === 'features' ? 'Datos' : 'Multimedia'}</h4>
                        <div style={{display:'flex', gap:5}}>
                            <button type="button" onClick={()=>moveSection(index, -1)} disabled={index===0} title="Subir"><FaArrowUp/></button>
                            <button type="button" onClick={()=>moveSection(index, 1)} disabled={index===sections.length-1} title="Bajar"><FaArrowDown/></button>
                            <button type="button" onClick={()=>removeSection(index)} style={{background:'red', color:'white', border:'none'}} title="Borrar"><FaTrash/></button>
                        </div>
                    </div>

                    {/* EDITOR DE CONTENIDO VISUAL */}
                    {sec.type !== 'features' && (
                        <>
                            <div className={styles.formGroup}><label>Título:</label><ReactQuill theme="snow" value={sec.title} onChange={v => updateSection(index, 'title', v)} modules={titleModules} /></div>
                            <div className={styles.formGroup}><label>Texto:</label><ReactQuill theme="snow" value={sec.text} onChange={v => updateSection(index, 'text', v)} modules={quillModules} /></div>
                            
                            <MediaManager 
                                label="Archivos Multimedia"
                                mediaList={sec.media} 
                                setMediaList={(newMedia) => updateSection(index, 'media', newMedia)} 
                            />

                            <div style={{background:'#e9ecef', padding:10, borderRadius:5, marginTop:10}}>
                                <label style={{fontSize:'0.8rem', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}><FaCog/> Ajustes de Imagen</label>
                                <div style={{display:'flex', gap:10, flexWrap:'wrap', marginTop:5}}>
                                    <div style={{flex:1}}>
                                        <label style={{fontSize:'0.75rem'}}>Altura (px):</label>
                                        <input type="number" value={sec.imgHeight || 400} onChange={e => updateSection(index, 'imgHeight', parseInt(e.target.value))} className={styles.inputSimple} style={{width:'100%'}}/>
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={{fontSize:'0.75rem'}}>Ajuste:</label>
                                        <select value={sec.imgFit || 'cover'} onChange={e => updateSection(index, 'imgFit', e.target.value)} className={styles.inputSimple} style={{width:'100%'}}>
                                            <option value="cover">Recortar (Llenar)</option>
                                            <option value="contain">Ver Completa</option>
                                        </select>
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={{fontSize:'0.75rem'}}>Posición:</label>
                                        <select value={sec.imgPos || 'center'} onChange={e => updateSection(index, 'imgPos', e.target.value)} className={styles.inputSimple} style={{width:'100%'}}>
                                            <option value="center">Centro</option>
                                            <option value="top">Arriba</option>
                                            <option value="bottom">Abajo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {sec.type === 'features' && (
                        <>
                            <div className={styles.formGroup}><label>Título Sección:</label><ReactQuill theme="snow" value={sec.title} onChange={v => updateSection(index, 'title', v)} modules={titleModules} /></div>
                            <div className={styles.formGroup}><label>Imagen de Fondo:</label>
                                <input type="file" onChange={e => {
                                    if(e.target.files[0]) updateSection(index, 'bgFile', e.target.files[0]);
                                }} accept="image/*" />
                            </div>
                            
                            <label>Lista de Datos:</label>
                            {sec.featuresList.map((item, fIdx) => (
                                <div key={fIdx} className={styles.featureRow} style={{background:'#f9f9f9', padding:5, marginBottom:5, borderRadius:4}}>
                                    <div style={{display:'flex', gap:5, marginBottom:5}}>
                                        <input value={item.data} onChange={e => updateFeatureItem(index, fIdx, 'data', e.target.value)} placeholder="Dato" className={styles.inputSimple} style={{flex:1}} />
                                        <input value={item.label} onChange={e => updateFeatureItem(index, fIdx, 'label', e.target.value)} placeholder="Etiqueta" className={styles.inputSimple} style={{flex:2}} />
                                        <button type="button" onClick={() => removeFeatureItem(index, fIdx)} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}>X</button>
                                    </div>
                                    <input value={item.title} onChange={e => updateFeatureItem(index, fIdx, 'title', e.target.value)} placeholder="Título" className={styles.inputSimple} style={{width:'100%', marginBottom:5}} />
                                    <textarea value={item.desc} onChange={e => updateFeatureItem(index, fIdx, 'desc', e.target.value)} placeholder="Descripción" className={styles.inputSimple} style={{width:'100%', minHeight:40}} />
                                </div>
                            ))}
                            <button type="button" onClick={() => addFeatureItem(index)} className={styles.addBtn}>+ Dato</button>
                        </>
                    )}
                </div>
            ))}

            <div style={{margin:'20px 0', padding:'15px', border:'2px dashed #ddd', textAlign:'center', borderRadius:8}}>
                <p style={{marginTop:0, fontWeight:'bold', color:'#555'}}>Agregar Nueva Sección:</p>
                <div style={{display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap'}}>
                    <button type="button" onClick={()=>addSection('text_media')} className={styles.addBtn} style={{background:'#007bff'}}>Texto + Media</button>
                    <button type="button" onClick={()=>addSection('media_text')} className={styles.addBtn} style={{background:'#007bff'}}>Media + Texto</button>
                    <button type="button" onClick={()=>addSection('full_media')} className={styles.addBtn} style={{background:'#17a2b8'}}>Media Full</button>
                    <button type="button" onClick={()=>addSection('features')} className={styles.addBtn} style={{background:'#6f42c1'}}>Datos Clave</button>
                </div>
            </div>

            <div className={styles.modalActions}>
                <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancelar</button>
                <button type="submit" disabled={loading} className={styles.saveBtn}>{loading?'Guardando...':'Guardar Todo'}</button>
            </div>
        </form>
    </div></div>
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
        if (docSnap.exists()) {
            let d = docSnap.data();
            
            // --- MIGRACIÓN ---
            if (!d.sections) {
                d.sections = [];
                if (d.introTitle || d.introText || d.introImageUrl || (d.introMedia && d.introMedia.length > 0)) {
                    d.sections.push({
                        id: 'old_intro', type: 'text_media', 
                        title: d.introTitle||'', text: d.introText||'', 
                        media: d.introMedia || (d.introImageUrl ? [{type:d.introType||'image', url:d.introImageUrl}] : []),
                        imgHeight: 400, imgFit: 'cover'
                    });
                }
                if (d.sec2Title || d.sec2Text || d.sec2ImageUrl || (d.sec2Media && d.sec2Media.length > 0)) {
                    d.sections.push({
                        id: 'old_sec2', type: 'media_text',
                        title: d.sec2Title||'', text: d.sec2Text||'',
                        media: d.sec2Media || (d.sec2ImageUrl ? [{type:d.sec2Type||'image', url:d.sec2ImageUrl}] : []),
                        imgHeight: 400, imgFit: 'cover'
                    });
                }
                if ((d.featuresList && d.featuresList.length > 0) || d.featuresTitle) {
                    d.sections.push({
                        id: 'old_feat', type: 'features',
                        title: d.featuresTitle||'Datos Clave',
                        featuresList: d.featuresList || [],
                        bgUrl: d.featuresBgUrl || ''
                    });
                }
            }
            if (!d.heroMedia && d.heroImageUrl) {
                d.heroMedia = [{ type: d.heroType || 'image', url: d.heroImageUrl }];
            } else if (!d.heroMedia) {
                d.heroMedia = [];
            }
            setPageData(d);
        }
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleSave = async ({ heroTitle, heroSubtitle, heroMedia, sections }) => {
    try {
        const processMediaList = async (list, prefix) => {
            return await Promise.all(list.map(async (item) => {
                if (item.file) {
                    const folder = item.type === 'video' ? 'marketing/videos' : 'marketing/images';
                    const refF = ref(storage, `${folder}/${id}_${prefix}_${Date.now()}_${item.file.name}`);
                    
                    // METADATA PARA CALIDAD
                    const metadata = { contentType: item.file.type }; 
                    await uploadBytes(refF, item.file, metadata);
                    
                    const url = await getDownloadURL(refF);
                    return { type: item.type, url: url };
                }
                return { type: item.type, url: item.url };
            }));
        };

        const processedHeroMedia = await processMediaList(heroMedia, 'hero');

        const processedSections = await Promise.all(sections.map(async (sec, idx) => {
            let newSec = { ...sec };
            if (newSec.media && newSec.media.length > 0) {
                newSec.media = await processMediaList(newSec.media, `sec${idx}`);
            }
            if (newSec.type === 'features' && newSec.bgFile) {
                const refBg = ref(storage, `marketing/${id}_feat_bg_${idx}_${Date.now()}`);
                await uploadBytes(refBg, newSec.bgFile, { contentType: newSec.bgFile.type });
                newSec.bgUrl = await getDownloadURL(refBg);
                delete newSec.bgFile; 
            }
            return newSec;
        }));

        const updates = {
            heroTitle, heroSubtitle,
            heroMedia: processedHeroMedia,
            sections: processedSections,
            heroImageUrl: processedHeroMedia[0]?.url || '',
            heroType: processedHeroMedia[0]?.type || 'image',
        };

        const docRef = doc(db, 'marketing_pages', id);
        await updateDoc(docRef, updates);
        setPageData(prev => ({ ...prev, ...updates }));
        setIsEditing(false);
        toast.success("Página Actualizada");
    } catch (error) { console.error(error); toast.error("Error al guardar"); }
  };

  if (loading) return <div style={{padding:'4rem', textAlign:'center'}}>Cargando...</div>;
  if (!pageData) return <div style={{padding:'4rem', textAlign:'center'}}>Página no encontrada.</div>;

  return (
    <div className={styles.pageContainer}>
      {isAdmin && <button className={styles.adminEditBtn} onClick={() => setIsEditing(true)}><FaEdit /> Editar Página</button>}
      
      {isEditing && <PageEditorModal data={pageData} onSave={handleSave} onClose={() => setIsEditing(false)} />}

      {/* 1. HERO */}
      <section className={styles.heroSection} style={{position:'relative', overflow:'hidden'}}> 
        <MediaCarousel mediaList={pageData.heroMedia} isHero={true} />
        <div className={styles.heroOverlay} style={{background: 'rgba(0,0,0,0.4)', zIndex:1, position:'absolute', top:0, left:0, width:'100%', height:'100%'}}></div>
        <div className={styles.heroContent} style={{pointerEvents:'none', zIndex:2, position:'relative'}}>
            <h1 className={styles.heroTitle} dangerouslySetInnerHTML={{ __html: pageData.heroTitle }} />
            <div className={styles.heroSubtitle} dangerouslySetInnerHTML={{ __html: pageData.heroSubtitle }} />
        </div>
      </section>

      {/* SECCIONES */}
      {pageData.sections && pageData.sections.map((sec, idx) => {
          
          if (sec.type === 'features') {
              const bgStyle = sec.bgUrl ? {
                  backgroundImage: `url(${sec.bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'
              } : { backgroundColor: '#343A40' };
              
              return (
                <section key={idx} className={styles.featuresSection} style={bgStyle}>
                    {sec.bgUrl && <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:1}}></div>}
                    <div className={styles.featuresContainer} style={{position:'relative', zIndex:2}}>
                        <div className={styles.featuresHeader}><h2 dangerouslySetInnerHTML={{ __html: sec.title }} /></div>
                        <div className={styles.featureList}>
                            {(sec.featuresList || []).map((item, i) => (
                                <div key={i} className={styles.featureItem}>
                                    <div className={styles.featureData}>{item.data} <span>{item.label}</span></div>
                                    <div className={styles.featureDescription}><h3>{item.title}</h3><p>{item.desc}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
              );
          } 
          
          // MEDIA COMPLETA
          if (sec.type === 'full_media') {
              const h = sec.imgHeight ? `${sec.imgHeight}px` : '500px';
              return (
                  <section key={idx} style={{width:'100%', minHeight:400, position:'relative'}}>
                      <MediaCarousel mediaList={sec.media} isHero={false} height={h} fit={sec.imgFit} pos={sec.imgPos} />
                      {(sec.title || sec.text) && (
                          <div style={{padding:'2rem', textAlign:'center', background:'#f8f9fa'}}>
                              <h2 dangerouslySetInnerHTML={{__html:sec.title}}/>
                              <div dangerouslySetInnerHTML={{__html:sec.text}}/>
                          </div>
                      )}
                  </section>
              );
          }

          // TEXTO + MEDIA (LATERAL)
          const mediaBlock = (
            <div className={styles.introImage} style={{position:'relative', minHeight: sec.imgHeight ? `${sec.imgHeight}px` : '300px'}}>
                <MediaCarousel 
                    mediaList={sec.media} 
                    isHero={false} 
                    height={sec.imgHeight ? `${sec.imgHeight}px` : '300px'} 
                    fit={sec.imgFit} 
                    pos={sec.imgPos}
                />
            </div>
          );

          return (
            <section key={idx} className={styles.introSection}>
                {sec.type === 'media_text' && mediaBlock}
                
                <div className={styles.introText}>
                    <h2 dangerouslySetInnerHTML={{ __html: sec.title }} />
                    <div dangerouslySetInnerHTML={{ __html: sec.text }} />
                </div>

                {sec.type === 'text_media' && mediaBlock}
            </section>
          );
      })}
    </div>
  );
}

export default MarketingPage;
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';
import './HomePageMobile.css'; 
import {
  FaArrowRight, FaTractor, FaIndustry, FaSearch, FaChevronRight, FaChevronLeft, FaEdit, FaTrash, FaPlus, FaArrowUp, FaArrowDown, FaYoutube
} from 'react-icons/fa';
import { db, storage } from '../firebase/config.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc, where, documentId } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// --- HELPERS ---
const truncateText = (html, length) => {
  if (!html) return '';
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = div.textContent || div.innerText || "";
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const stripHtml = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const quillModules = {
  toolbar: [['bold', 'italic', 'underline'], [{ 'header': [1, 2, 3, false] }], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']],
};
const titleModules = {
  toolbar: [['bold', 'italic', 'underline'], [{ 'color': [] }], ['clean']],
};

const GetCategoryIcon = ({ iconName, className }) => {
  const IconMap = { FaTractor: <FaTractor />, FaIndustry: <FaIndustry />, FaSearch: <FaSearch />, GiHarvester: <FaTractor />, GiSeedling: <FaIndustry />, GiFarmTractor: <FaTractor /> };
  const Icon = IconMap[iconName] || <FaIndustry />;
  return React.cloneElement(Icon, { className: className || styles.categoryIcon });
};

// --- MODAL 1: HERO SLIDES ---
const HeroSlidesEditorModal = ({ slides, onSave, onClose }) => {
  const [localSlides, setLocalSlides] = useState(Array.isArray(slides) ? slides : []);
  const [editingIndex, setEditingIndex] = useState(null); 
  const [d, setD] = useState({ title:'', indicatorTitle:'', text:'', buttonText:'', type:'image', url:'' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const startEdit = (i) => {
      if(i >= 0) { setD(localSlides[i]); setPreview(localSlides[i].url); setEditingIndex(i); }
      else { setD({ title:'', indicatorTitle:'', text:'', buttonText:'SOLICITAR ASESORAMIENTO', type:'image', url:'' }); setPreview(''); setEditingIndex('NEW'); }
      setFile(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
      if (e.target.files[0].type.startsWith('video/')) setD({...d, type:'video'}); else setD({...d, type:'image'});
    }
  };

  const save = async (e) => {
      e.preventDefault(); setLoading(true);
      try {
        let url = preview;
        if(d.type === 'youtube') {
            url = d.url;
        } else if (file) {
            const r = ref(storage, `hero/${d.type==='video'?'v':'i'}/${Date.now()}_${file.name}`);
            await uploadBytes(r, file); url = await getDownloadURL(r);
        }
        const newSlide = { ...d, url };
        const newSlides = [...localSlides];
        if(editingIndex === 'NEW') newSlides.push(newSlide); else newSlides[editingIndex] = newSlide;
        setLocalSlides(newSlides); setEditingIndex(null); 
      } catch (error) { console.error(error); toast.error("Error"); }
      setLoading(false);
  };

  const move = (i, dir) => {
      const arr = [...localSlides];
      if(dir==='up' && i>0) [arr[i], arr[i-1]] = [arr[i-1], arr[i]];
      if(dir==='down' && i<arr.length-1) [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
      setLocalSlides(arr);
  };

  const handleFinalSave = async () => {
    setLoading(true);
    await onSave('hero', { heroSlides: localSlides });
    setLoading(false);
    onClose();
  };

  return (
    <div className={styles.adminEditorOverlay}><div className={styles.adminEditorModal}>
      <h3>Gestor Hero</h3>
      {editingIndex === null ? (
        <>
          <div className={styles.slideList}>{localSlides.map((s, i) => (
            <div key={i} className={styles.slideItem}>
              <span><strong>#{i+1}</strong> {s.type==='video'?'🎬':(s.type==='youtube'?'🟥':'📷')} {s.indicatorTitle || stripHtml(s.title).substring(0,20)}</span>
              <div className={styles.slideActions}>
                <button type="button" onClick={()=>move(i,'up')}><FaArrowUp/></button><button type="button" onClick={()=>move(i,'down')}><FaArrowDown/></button>
                <button type="button" onClick={()=>startEdit(i)}><FaEdit/></button><button type="button" onClick={()=>{if(confirm('Borrar?')) setLocalSlides(localSlides.filter((_,x)=>x!==i))}}><FaTrash/></button>
              </div>
            </div>
          ))}</div>
          <button className={styles.createBtn} onClick={()=>startEdit(-1)}>+ Slide</button>
          <div className={styles.formActions}><button type="button" onClick={onClose}>Cerrar</button><button type="button" onClick={handleFinalSave}>Guardar Todo</button></div>
        </>
      ) : (
        <form onSubmit={save} className={styles.formFields}>
           <div className={styles.formGroup}>
               <label>Tipo:</label>
               <select value={d.type} onChange={e=>setD({...d, type:e.target.value, url:''})}>
                   <option value="image">Imagen</option>
                   <option value="video">Video (MP4)</option>
                   <option value="youtube">YouTube</option>
               </select>
           </div>
           
           {d.type === 'youtube' ? (
               <div className={styles.formGroup}><label>URL YouTube:</label><input key="yt-input" value={d.url} onChange={e=>{setD({...d, url:e.target.value}); setPreview(e.target.value)}}/></div>
           ) : (
               <div className={styles.formGroup}><label>Archivo:</label><input key="file-input" type="file" onChange={handleFileChange}/>{preview && <div style={{marginTop:10}}>{d.type==='video'?<video src={preview} width="150" controls/>:<img src={preview} width="150"/>}</div>}</div>
           )}

           <div className={styles.formGroup}><label>Título Principal:</label><ReactQuill value={d.title} onChange={v=>setD({...d,title:v})} modules={titleModules}/></div>
           <div className={styles.formGroup}><label>Título Barra (Abajo):</label><input value={d.indicatorTitle} onChange={e=>setD({...d,indicatorTitle:e.target.value})} placeholder="Ej: DE GROUP 2026"/></div>
           <div className={styles.formGroup}><label>Descripción:</label><ReactQuill value={d.text} onChange={v=>setD({...d,text:v})} modules={quillModules}/></div>
           <div className={styles.formGroup}><label>Botón:</label><input value={d.buttonText} onChange={e=>setD({...d,buttonText:e.target.value})}/></div>
           <div className={styles.formActions}><button type="button" onClick={()=>setEditingIndex(null)}>Volver</button><button type="submit" disabled={loading}>Guardar Slide</button></div>
        </form>
      )}
    </div></div>
  );
};

// --- MODAL 2: SECCIÓN GENÉRICA ---
const AdminSectionEditor = ({ sectionName, initialData, onSave, onClose }) => {
  const [title, setTitle] = useState(initialData.title||''); const [text, setText] = useState(initialData.text||'');
  const [buttonText, setButtonText] = useState(initialData.buttonText||''); const [overlayText, setOverlayText] = useState(initialData.overlayText||'');
  const [file, setFile] = useState(null); const [prev, setPrev] = useState(initialData.imageUrl||''); const [loading, setLoading] = useState(false);
  const isMedia = sectionName !== 'news' && sectionName !== 'promotions';
  
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    let img = initialData.imageUrl;
    if(isMedia && file) { const r = ref(storage, `sections/${sectionName}_${Date.now()}`); await uploadBytes(r, file); img = await getDownloadURL(r); }
    const data = { ...initialData, title, text, buttonText, imageUrl: img };
    if(sectionName === 'agritechnica') data.overlayText = overlayText;
    await onSave(sectionName, data); setLoading(false); onClose();
  };

  return (
    <div className={styles.adminEditorOverlay}><div className={styles.adminEditorModal}>
      <h3>Editar {sectionName}</h3>
      <form onSubmit={handleSubmit} className={styles.formFields}>
        <div className={styles.formGroup}><label>Título:</label><ReactQuill value={title} onChange={setTitle} modules={titleModules}/></div>
        <div className={styles.formGroup}><label>Texto:</label><ReactQuill value={text} onChange={setText} modules={quillModules}/></div>
        {isMedia && <div className={styles.formGroup}><label>Botón:</label><input value={buttonText} onChange={e=>setButtonText(e.target.value)}/></div>}
        {sectionName==='agritechnica' && <div className={styles.formGroup}><label>Overlay:</label><input value={overlayText} onChange={e=>setOverlayText(e.target.value)}/></div>}
        {sectionName==='finalCta' && <p style={{color:'#666'}}>Sube un PNG transparente.</p>}
        {sectionName!=='hero' && <div className={styles.formGroup}><label>Imagen:</label><input type="file" onChange={e=>{setFile(e.target.files[0]); setPrev(URL.createObjectURL(e.target.files[0]))}}/>{prev && <img src={prev} style={{width:100}}/>}</div>}
        <div className={styles.formActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>Guardar</button></div>
      </form>
    </div></div>
  );
};

// --- MODAL 3: NEWS CARD ---
const NewsEditModal = ({ product, currentOrder, onSave, onClose }) => {
    const [d, setD] = useState({name:product.name, description:product.description, order:currentOrder}); const [file, setFile] = useState(null);
    return (
        <div className={styles.adminEditorOverlay}><div className={styles.adminEditorModal}>
            <h3>Editar Tarjeta (Portada)</h3>
            <form onSubmit={async (e)=>{e.preventDefault(); await onSave(product.id, {name:d.name, description:d.description, order:parseInt(d.order)}, file); onClose();}}>
                <div className={styles.formGroup}><label>Título:</label><ReactQuill value={d.name} onChange={v=>setD({...d,name:v})} modules={titleModules}/></div>
                <div className={styles.formGroup}><label>Desc:</label><ReactQuill value={d.description} onChange={v=>setD({...d,description:v})} modules={quillModules}/></div>
                <div className={styles.formGroup}><label>Posición:</label><input type="number" value={d.order} onChange={e=>setD({...d,order:parseInt(e.target.value)})}/></div>
                <div className={styles.formGroup}><label>Imagen de Portada:</label><input type="file" onChange={e=>setFile(e.target.files[0])} accept="image/*"/></div>
                <div className={styles.formActions}><button onClick={onClose}>Cancelar</button><button type="submit">Guardar</button></div>
            </form>
        </div></div>
    );
};

// --- MODAL 4: SELECCIÓN PRODUCTOS ---
const FeaturedProductsEditorModal = ({ sectionName, initialProductIDs, onSave, onClose, allProducts }) => {
    const [ids, setIds] = useState(new Set(initialProductIDs||[])); const [search, setSearch] = useState('');
    const [isNew, setIsNew] = useState(false); const [nData, setNData] = useState({title:'', desc:''});
    
    // ESTADOS SEPARADOS
    const [cardFile, setCardFile] = useState(null); 
    const [landingType, setLandingType] = useState('image');
    const [landingFile, setLandingFile] = useState(null);
    const [landingUrl, setLandingUrl] = useState(''); 

    const handleSaveSelection = async () => { await onSave(sectionName, {productIDs: Array.from(ids)}); onClose(); };

    const handleCreate = async (e) => {
        e.preventDefault(); 
        toast.loading("Creando...");

        const cardRef = ref(storage, `marketing/cards/${Date.now()}_${cardFile.name}`);
        await uploadBytes(cardRef, cardFile);
        const cardUrl = await getDownloadURL(cardRef);

        let heroUrl = cardUrl; 
        let heroType = landingType;

        if (landingType === 'video' && landingFile) {
            const vidRef = ref(storage, `marketing/videos/${Date.now()}_${landingFile.name}`);
            await uploadBytes(vidRef, landingFile);
            heroUrl = await getDownloadURL(vidRef);
        } else if (landingType === 'youtube') {
            heroUrl = landingUrl;
        } else if (landingType === 'image' && landingFile) {
            const imgRef = ref(storage, `marketing/hero/${Date.now()}_${landingFile.name}`);
            await uploadBytes(imgRef, landingFile);
            heroUrl = await getDownloadURL(imgRef);
        }

        const pg = await addDoc(collection(db,'marketing_pages'), {
            heroTitle: nData.title, 
            heroSubtitle: truncateText(nData.desc,50), 
            heroImageUrl: heroUrl,
            heroType: heroType, 
            type: 'custom'
        });

        const pr = await addDoc(collection(db,'products'), {
            name: nData.title, 
            description: nData.desc, 
            imageUrls: [cardUrl], 
            isMarketing: true, 
            marketingPageId: pg.id, 
            order: 999
        });

        setIds(prev=>new Set(prev).add(pr.id)); 
        setIsNew(false); 
        toast.dismiss();
        toast.success("Creado con éxito");
    };

    const filteredList = allProducts.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));

    return (
        <div className={styles.adminEditorOverlay}><div className={styles.adminEditorModal} style={{maxWidth:700}}>
            {!isNew ? (
                <>
                 <h3>Elegir Tarjetas ({sectionName})</h3>
                 <button className={styles.createBtn} onClick={()=>setIsNew(true)}>+ Crear Nueva Noticia</button>
                 <input className={styles.searchInput} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
                 <div className={styles.productListContainer}>{filteredList.map(p=>(
                     <label key={p.id} className={styles.productListItem}><input type="checkbox" checked={ids.has(p.id)} onChange={()=>{const n=new Set(ids); if(n.has(p.id))n.delete(p.id); else n.add(p.id); setIds(n)}}/> {stripHtml(p.name || 'Sin Nombre')}</label>
                 ))}</div>
                 <div className={styles.formActions}><button onClick={onClose}>Cerrar</button><button onClick={handleSaveSelection}>Guardar Selección</button></div>
                </>
            ) : (
                <form onSubmit={handleCreate} style={{maxHeight:'80vh', overflowY:'auto'}}>
                    <h4>Crear Noticia / Landing Page</h4>
                    
                    <div className={styles.formGroup}><label>Título:</label><ReactQuill value={nData.title} onChange={v=>setNData({...nData,title:v})} modules={titleModules}/></div>
                    <div className={styles.formGroup}><label>Texto Corto:</label><ReactQuill value={nData.desc} onChange={v=>setNData({...nData,desc:v})} modules={quillModules}/></div>
                    
                    <hr style={{margin:'20px 0', border:'1px solid #eee'}}/>
                    
                    <h5>1. Imagen para la Tarjeta (Inicio)</h5>
                    <div className={styles.formGroup}>
                        <input type="file" required onChange={e=>setCardFile(e.target.files[0])} accept="image/*"/>
                        <small>Esta imagen se verá en la cuadrícula de novedades.</small>
                    </div>

                    <hr style={{margin:'20px 0', border:'1px solid #eee'}}/>

                    <h5>2. Multimedia para la Landing Page</h5>
                    <div className={styles.formGroup}>
                        <label>Tipo de contenido al abrir:</label>
                        <select value={landingType} onChange={e=>setLandingType(e.target.value)}>
                            <option value="image">Usar la misma imagen</option>
                            <option value="upload_image">Subir otra imagen</option>
                            <option value="video">Subir Video (MP4)</option>
                            <option value="youtube">Video de YouTube</option>
                        </select>
                    </div>

                    {landingType === 'video' && (
                        <div className={styles.formGroup}><label>Archivo de Video:</label><input type="file" required onChange={e=>setLandingFile(e.target.files[0])} accept="video/*"/></div>
                    )}
                    {landingType === 'upload_image' && (
                        <div className={styles.formGroup}><label>Archivo de Imagen:</label><input type="file" required onChange={e=>setLandingFile(e.target.files[0])} accept="image/*"/></div>
                    )}
                    {landingType === 'youtube' && (
                        <div className={styles.formGroup}><label>Enlace YouTube:</label><input required placeholder="https://youtube.com/..." value={landingUrl} onChange={e=>setLandingUrl(e.target.value)}/></div>
                    )}

                    <div className={styles.formActions}><button type="button" onClick={()=>setIsNew(false)}>Volver</button><button type="submit">Crear Todo</button></div>
                </form>
            )}
        </div></div>
    );
};

// --- MODAL 5: CATEGORÍA ---
const CategoryEditorModal = ({ initialData, onSave, onClose, productCategories }) => {
    const [d, setD] = useState({name:initialData.name||'', order:initialData.order||0, link:initialData.link||''}); const [file, setFile] = useState(null);
    const [cat, setCat] = useState(''); const [newCat, setNewCat] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        let url = initialData.iconUrl;
        if(file){ const r=ref(storage,`icons/${Date.now()}`); await uploadBytes(r,file); url=await getDownloadURL(r); }
        const link = `/productos?categoria=${encodeURIComponent(cat==='__NEW__'?newCat:cat)}`;
        await onSave({...d, iconUrl:url, link}, initialData.id); onClose();
    };
    return (
        <div className={styles.adminEditorOverlay}><div className={styles.adminEditorModal}>
            <h3>Categoría</h3>
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}><label>Nombre:</label><input value={d.name} onChange={e=>setD({...d,name:e.target.value})} required/></div>
                <div className={styles.formGroup}><label>Vincular:</label><select onChange={e=>setCat(e.target.value)}><option value="">Elegir</option>{productCategories.map(c=>(
                    <option key={c} value={c}>{c}</option>
                ))}<option value="__NEW__">Nueva</option></select></div>
                {cat==='__NEW__' && <div className={styles.formGroup}><input placeholder="Nueva" value={newCat} onChange={e=>setNewCat(e.target.value)}/></div>}
                <div className={styles.formGroup}><label>Icono:</label><input type="file" onChange={e=>setFile(e.target.files[0])}/></div>
                <div className={styles.formGroup}><label>Orden:</label><input type="number" value={d.order} onChange={e=>setD({...d,order:e.target.value})}/></div>
                <div className={styles.formActions}><button onClick={onClose}>Cancelar</button><button type="submit">Guardar</button></div>
            </form>
        </div></div>
    );
};

// --- COMPONENTE PRINCIPAL ---
function HomePage() {
  const { user } = useAuth(); const isAdmin = user && (user.role === 'admin' || user.role === 'gestion');
  
  const [heroData, setHeroData] = useState({heroSlides:[{title:'DE Group',text:'',buttonText:'SOLICITAR ASESORAMIENTO',type:'image',url:''}]});
  const [agritechnicaData, setAgritechnicaData] = useState({title:'AGRO',text:'',buttonText:'VER',imageUrl:''});
  const [finalCtaData, setFinalCtaData] = useState({title:'Final CTA',text:'',buttonText:'CONTACTO',imageUrl:''});
  const [newsData, setNewsData] = useState({title:'Novedades',text:'',productIDs:[]});
  const [promotionsData, setPromotionsData] = useState({title:'Promociones',text:'',productIDs:[]});
  
  const [featuredProducts, setFeaturedProducts] = useState([]); const [promotionsList, setPromotionsList] = useState([]);
  const [categories, setCategories] = useState([]); const [allProducts, setAllProducts] = useState([]); const [prodCats, setProdCats] = useState([]);
  
  const [currSlide, setCurrSlide] = useState(0); const [progress, setProgress] = useState(0);
  const [modals, setModals] = useState({hero:false, agri:false, final:false, news:false, promo:false, newsCards:false, promoCards:false, cat:false, card:false});
  
  // --- ESTADO CORREGIDO ---
  const [currCat, setCurrCat] = useState(null); 
  const [cardToEdit, setCardToEdit] = useState(null); // CORRECCIÓN: Nombre coincidente
  const [editCtx, setEditCtx] = useState('');
  
  const videoRef = useRef(null); 
  const progressInterval = useRef(null); 
  const newsRef = useRef(null); const promoRef = useRef(null);

  useEffect(() => {
      const load = async () => {
          const fetch = async (col, id, set) => { const d = await getDoc(doc(db,col,id)); if(d.exists()) set(prev=>({...prev, ...d.data()})); };
          
          const h = await getDoc(doc(db,'sections','hero'));
          if(h.exists()) { const d=h.data(); if(!d.heroSlides && d.imageUrl) setHeroData({heroSlides:[{title:d.title, text:d.text, buttonText:d.buttonText, url:d.videoUrl||d.imageUrl, type:d.videoUrl?'video':'image'}]}); else setHeroData(d); }
          
          await fetch('sections','agritechnica',setAgritechnicaData);
          await fetch('sections','finalCta',setFinalCtaData);
          
          const n = await getDoc(doc(db,'sections','news')); if(n.exists()) { setNewsData(n.data()); loadProds(n.data().productIDs, setFeaturedProducts); }
          const p = await getDoc(doc(db,'sections','promotions')); if(p.exists()) { setPromotionsData(p.data()); loadProds(p.data().productIDs, setPromotionsList); }
          
          const cs = await getDocs(query(collection(db,'categories'), orderBy('order'))); setCategories(cs.docs.map(d=>({id:d.id,...d.data()})));
          
          const ps = await getDocs(collection(db,'products')); 
          const pList = ps.docs.map(d => ({id:d.id, name:d.data().name, ...d.data()}));
          setAllProducts(pList);
          
          const cats = new Set(); 
          pList.forEach(d => d.category && cats.add(d.category)); 
          setProdCats(Array.from(cats));
      };
      load();
  }, [isAdmin]);

  const loadProds = async (ids, set) => {
      if(!ids?.length) { set([]); return; }
      const q = query(collection(db,'products'), where(documentId(),'in',ids));
      const s = await getDocs(q);
      const l = s.docs.map(d=>({id:d.id,...d.data()}));
      l.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
      set(l);
  };

  const saveData = async (sec, data) => {
      await setDoc(doc(db,'sections',sec), data, {merge:true});
      if(sec==='hero'){ setHeroData(prev=>({...prev,...data})); setCurrSlide(0); setProgress(0); }
      if(sec==='agritechnica') setAgritechnicaData(prev=>({...prev,...data}));
      if(sec==='finalCta') setFinalCtaData(prev=>({...prev,...data}));
      if(sec==='news'){ setNewsData(prev=>({...prev,...data})); loadProds(data.productIDs, setFeaturedProducts); }
      if(sec==='promotions'){ setPromotionsData(prev=>({...prev,...data})); loadProds(data.productIDs, setPromotionsList); }
      toast.success("Guardado");
  };

  const activeSlide = heroData.heroSlides?.[currSlide];
  const nextSlide = () => { if(heroData.heroSlides) { setProgress(0); setCurrSlide(c=>(c+1)%heroData.heroSlides.length); } };

  const handleVideoEnded = () => {
      if(heroData.heroSlides.length === 1 && videoRef.current) { 
          videoRef.current.currentTime=0; 
          videoRef.current.play(); 
          setProgress(0); 
      } else { nextSlide(); }
  };
  
  const handleVideoTimeUpdate = (e) => { if(e.target.duration) setProgress((e.target.currentTime / e.target.duration) * 100); };

  useEffect(() => {
      if (activeSlide?.type === 'video' && videoRef.current) {
          videoRef.current.play().catch(()=>{});
      }
  }, [currSlide, activeSlide]);

  useEffect(() => {
      if(!activeSlide) return;
      if(progressInterval.current) clearInterval(progressInterval.current);
      
      if(activeSlide.type === 'image' || activeSlide.type === 'youtube') {
          const duration = activeSlide.type === 'youtube' ? 15000 : 5000;
          let t=0; 
          progressInterval.current = setInterval(()=>{ 
              t+=50; 
              setProgress(Math.min((t/duration)*100, 100)); 
              if(t>=duration){ clearInterval(progressInterval.current); nextSlide(); } 
          }, 50);
      } else { 
          setProgress(0);
      }
      return () => clearInterval(progressInterval.current);
  }, [currSlide, heroData.heroSlides]);

  const toggleModal = (m, v) => setModals(prev=>({...prev, [m]:v}));
  const scroll = (ref, dir) => { if(ref.current) ref.current.scrollBy({left:dir==='left'?-300:300, behavior:'smooth'}); };

  const handleCardOps = {
      edit: (p, i, ctx) => { setCardToEdit({...p, order:i+1}); setEditCtx(ctx); setModals(prev=>({...prev, card:true})); },
      delete: async (id, ctx) => { if(confirm("¿Quitar?")) { const sec = ctx==='news'?newsData:promotionsData; const newIds = sec.productIDs.filter(x=>x!==id); await saveData(ctx, {productIDs: newIds}); } },
      save: async (id, data, file) => {
          let img = null;
          if(file) { const r = ref(storage, `marketing/${Date.now()}`); await uploadBytes(r, file); img = await getDownloadURL(r); }
          await updateDoc(doc(db,'products',id), {name:data.name, description:data.description, order:data.order, ...(img&&{imageUrls:[img]})});
          const sec = editCtx==='news'?newsData:promotionsData;
          if(data.order !== cardToEdit.order) {
              const ids = [...sec.productIDs].filter(x=>x!==id);
              ids.splice(Math.max(0, Math.min(data.order-1, ids.length)), 0, id);
              await saveData(editCtx, {productIDs: ids});
          } else { 
              if(editCtx==='news') loadProds(sec.productIDs, setFeaturedProducts); 
              else loadProds(sec.productIDs, setPromotionsList); 
          }
          setModals(prev=>({...prev, card:false})); 
          toast.success("Guardado");
      }
  };

  const renderCard = (p, i, context) => (
    <div key={p.id} className={styles.newsCard}>
        {isAdmin && <div className={styles.adminCardButtons} style={{top:10,right:10,position:'absolute'}}>
            <button className={styles.cardEditButton} onClick={(e)=>{e.preventDefault(); handleCardOps.edit(p,i,context)}}><FaEdit/></button>
            <button className={styles.cardDeleteButton} onClick={(e)=>{e.preventDefault(); handleCardOps.delete(p.id,context)}}><FaTrash/></button>
        </div>}
        <div className={styles.newsImage}><img src={p.imageUrls?.[0]} alt={p.name} /></div>
        <div className={styles.newsContent}>
            <h3 className={styles.newsTitle} dangerouslySetInnerHTML={{__html:p.name}}/>
            <div className={styles.newsDescription} dangerouslySetInnerHTML={{__html:truncateText(p.description,100)}}/>
            <Link to={p.isMarketing?`/novedades/${p.marketingPageId}`:`/producto/${p.id}`} className={styles.newsLink}>
                {p.isMarketing?'LEER MÁS':'VER PRODUCTO'} <FaChevronRight/>
            </Link>
        </div>
    </div>
  );

  return (
    <div className={styles.homePage}>
      {/* 1. HERO */}
      <section className={styles.heroSection}>
         {isAdmin && <button className={styles.heroEditButton} onClick={()=>toggleModal('hero',true)}><FaEdit/> Editar Slides</button>}
         {heroData.heroSlides?.map((s,i)=>(
             <div key={i} className={`${styles.heroSlide} ${i===currSlide?styles.active:''}`}>
                 {s.type==='youtube' ? (
                    <div className={styles.heroMedia} style={{pointerEvents:'none'}}>
                        <iframe src={`https://www.youtube.com/embed/${getYoutubeId(s.url)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYoutubeId(s.url)}&playsinline=1`} className={styles.heroMedia} frameBorder="0" allow="autoplay; encrypted-media" style={{width:'100%', height:'100%', objectFit:'cover'}}></iframe>
                        <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%'}}></div>
                    </div>
                 ) : s.type==='video' ? (
                    <video src={s.url} className={styles.heroMedia} muted playsInline ref={i===currSlide ? videoRef : null} onTimeUpdate={handleVideoTimeUpdate} onEnded={handleVideoEnded}/> 
                 ) : (
                    <div className={styles.heroMedia} style={{backgroundImage:`url(${s.url})`, backgroundSize:'cover', backgroundPosition:'center'}}/>
                 )}
                 <div className={styles.heroOverlay}></div>
                 <div className={styles.heroContent}>
                     <div className={styles.heroPrimaryText} dangerouslySetInnerHTML={{__html:s.title}}/>
                     <div className={styles.heroSecondaryText} dangerouslySetInnerHTML={{__html:s.text}}/>
                     {s.buttonText && <Link to="/contacto" className={styles.heroButton}>{s.buttonText} <FaChevronRight/></Link>}
                 </div>
             </div>
         ))}
         <div className={styles.heroIndicators}><div className={styles.indicatorContainer}>{heroData.heroSlides?.map((s,i)=>(
             <div key={i} className={`${styles.indicatorItem} ${i===currSlide?styles.active:''}`} onClick={()=>{setCurrSlide(i); setProgress(0);}}>
                 <div className={styles.progressBar}><div className={styles.progressFill} style={{width:i===currSlide?`${progress}%`:'0%'}}/></div>
                 <span className={styles.indicatorLabel}>{truncateText(stripHtml(s.indicatorTitle||s.title), 25)}</span>
             </div>
         ))}</div></div>
      </section>

      {/* 2. CATEGORÍAS */}
      <section className={styles.categoriesSection}>
          <h2 className={styles.sectionTitle}>Encuentra la máquina adecuada</h2>
          {isAdmin && <button className={styles.addCategoryButton} onClick={()=>{setCurrCat({}); toggleModal('cat',true)}}>+ Agregar</button>}
          <div className={styles.categoriesGrid}>{categories.map(c=>(
              <div key={c.id} className={styles.categoryCardWrapper}>
                  {isAdmin && <div className={styles.adminCardButtons}><button className={styles.cardEditButton} onClick={()=>{setCurrCat(c); toggleModal('cat',true)}}><FaEdit/></button><button className={styles.cardDeleteButton} onClick={async()=>{if(confirm('Borrar?')){await deleteDoc(doc(db,'categories',c.id)); window.location.reload();}}}><FaTrash/></button></div>}
                  <Link to={c.link} className={styles.categoryCard}>{c.iconUrl?<img src={c.iconUrl} className={styles.categoryIconImg}/>:<GetCategoryIcon iconName={c.icon}/>}<span>{c.name}</span></Link>
              </div>
          ))}</div>
      </section>

      {/* 3. AGROACTIVA */}
      <section className={styles.agritechnicaSection}>
          {isAdmin && <button className={styles.editButton} onClick={()=>toggleModal('agri',true)}><FaEdit/> Editar</button>}
          <div className={styles.agritechnicaGridContainer}>
              <div className={styles.agritechnicaContentWrapper}>
                  <h2 className={styles.agritechnicaTitle} dangerouslySetInnerHTML={{__html:agritechnicaData.title}}/>
                  <div className={styles.agritechnicaText} dangerouslySetInnerHTML={{__html:agritechnicaData.text}}/>
                  <Link to="/contacto" className={styles.agritechnicaButton}>{agritechnicaData.buttonText}</Link>
              </div>
              <div className={styles.agritechnicaImageContainer}><div className={styles.agritechnicaImageOverlayText}>{agritechnicaData.overlayText}</div><img src={agritechnicaData.imageUrl} className={styles.agritechnicaImage} alt="Agro"/></div>
          </div>
      </section>

      {/* 4. NOVEDADES */}
      <section className={styles.newsSection}>
          {isAdmin && <div className={styles.newsAdminControls}><button className={styles.editSectionButton} onClick={()=>toggleModal('news',true)}><FaEdit/> Sección</button><button className={styles.manageCardsButton} onClick={()=>toggleModal('newsCards',true)}><FaEdit/> Tarjetas</button></div>}
          <div className={styles.newsContentWrapper}>
              <div className={styles.newsHeader}><h2 className={styles.sectionTitle} dangerouslySetInnerHTML={{__html:newsData.title}}/><div className={styles.sectionSubtitle} dangerouslySetInnerHTML={{__html:newsData.text}}/></div>
              <div className={styles.carouselContainer}>
                  <div className={styles.carouselArrows}><button className={styles.scrollArrow} onClick={()=>scroll(newsRef,'left')}><FaChevronLeft/></button><button className={styles.scrollArrow} onClick={()=>scroll(newsRef,'right')}><FaChevronRight/></button></div>
                  <div className={styles.newsGrid} ref={newsRef}>{featuredProducts.map((p,i)=> renderCard(p, i, 'news'))}</div>
              </div>
          </div>
      </section>

      {/* 5. PROMOCIONES */}
      <section className={styles.promoSection}>
          {isAdmin && <div className={styles.newsAdminControls}><button className={styles.editSectionButton} onClick={()=>toggleModal('promo',true)}><FaEdit/> Sección</button><button className={styles.manageCardsButton} onClick={()=>toggleModal('promoCards',true)}><FaEdit/> Tarjetas</button></div>}
          <div className={styles.newsContentWrapper}>
              <div className={styles.newsHeader}><h2 className={styles.sectionTitle} dangerouslySetInnerHTML={{__html:promotionsData.title}}/><div className={styles.sectionSubtitle} dangerouslySetInnerHTML={{__html:promotionsData.text}}/></div>
              <div className={styles.carouselContainer}>
                  <div className={styles.carouselArrows}><button className={styles.scrollArrow} onClick={()=>scroll(promoRef,'left')}><FaChevronLeft/></button><button className={styles.scrollArrow} onClick={()=>scroll(promoRef,'right')}><FaChevronRight/></button></div>
                  <div className={styles.newsGrid} ref={promoRef}>{promotionsList.map((p,i)=> renderCard(p, i, 'promotions'))}</div>
              </div>
          </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className={styles.finalCtaSection}>
          {isAdmin && <button className={styles.editButton} onClick={()=>toggleModal('final',true)} style={{top:'2rem',left:'2rem',zIndex:99}}><FaEdit/> Editar</button>}
          <div className={styles.finalCtaContainer}>
              <div className={styles.finalCtaContent}>
                  <h2 className={styles.finalCtaTitle} dangerouslySetInnerHTML={{__html:finalCtaData.title}}/>
                  <div className={styles.finalCtaText} dangerouslySetInnerHTML={{__html:finalCtaData.text}}/>
                  <Link to="/contacto" className={styles.finalCtaButton}>{finalCtaData.buttonText}</Link>
              </div>
              <div className={styles.finalCtaImageWrapper}><img src={finalCtaData.imageUrl} className={styles.finalCtaImage}/></div>
          </div>
      </section>

      {/* MODALES */}
      {modals.hero && <HeroSlidesEditorModal slides={heroData.heroSlides} onSave={saveData} onClose={()=>toggleModal('hero',false)}/>}
      {modals.agri && <AdminSectionEditor sectionName="agritechnica" initialData={agritechnicaData} onSave={saveData} onClose={()=>toggleModal('agri',false)}/>}
      {modals.final && <AdminSectionEditor sectionName="finalCta" initialData={finalCtaData} onSave={saveData} onClose={()=>toggleModal('final',false)}/>}
      {modals.news && <AdminSectionEditor sectionName="news" initialData={newsData} onSave={saveData} onClose={()=>toggleModal('news',false)}/>}
      {modals.promo && <AdminSectionEditor sectionName="promotions" initialData={promotionsData} onSave={saveData} onClose={()=>toggleModal('promo',false)}/>}
      {modals.newsCards && <FeaturedProductsEditorModal sectionName="news" initialProductIDs={newsData.productIDs} allProducts={allProducts} onSave={saveData} onClose={()=>toggleModal('newsCards',false)}/>}
      {modals.promoCards && <FeaturedProductsEditorModal sectionName="promotions" initialProductIDs={promotionsData.productIDs} allProducts={allProducts} onSave={saveData} onClose={()=>toggleModal('promoCards',false)}/>}
      
      {/* CORRECCIÓN: initialData usa currCat en lugar de currentCategory */}
      {modals.cat && <CategoryEditorModal initialData={currCat} onSave={async(d,id)=>{
          if(id){await updateDoc(doc(db,'categories',id),d);} else {await addDoc(collection(db,'categories'),d);}
          toggleModal('cat',false); window.location.reload();
      }} onClose={()=>toggleModal('cat',false)} productCategories={prodCats}/>}
      
      {/* CORRECCIÓN: modals.card usa cardToEdit */}
      {modals.card && cardToEdit && <NewsEditModal product={cardToEdit} currentOrder={cardToEdit.order} totalItems={editCtx==='news'?featuredProducts.length:promotionsList.length} onSave={handleCardOps.save} onClose={()=>toggleModal('card',false)}/>}

    </div>
  );
}
export default HomePage;
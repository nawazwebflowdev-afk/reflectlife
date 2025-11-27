import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export const exportUserDataToPDF = async (userId: string) => {
  try {
    // Fetch all user data
    const [profile, templates, memorials, posts, tributes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('template_purchases').select('*, site_templates(name)').eq('buyer_id', userId),
      supabase.from('memorials').select('*').eq('user_id', userId),
      supabase.from('memorial_posts').select('*').eq('user_id', userId),
      supabase.from('memorial_tributes').select('*').eq('user_id', userId),
    ]);

    // Create PDF
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 7;
    const margin = 20;

    const addText = (text: string, isBold = false) => {
      if (yPos > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
      }
      if (isBold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(text, 20, yPos);
      yPos += lineHeight;
    };

    // Header
    doc.setFontSize(20);
    addText('ReflectLife - Your Personal Data Export', true);
    doc.setFontSize(10);
    addText(`Generated: ${new Date().toLocaleDateString()}`);
    yPos += 5;

    // Profile Section
    doc.setFontSize(16);
    addText('Profile Information', true);
    doc.setFontSize(10);
    if (profile.data) {
      addText(`Name: ${profile.data.full_name || 'N/A'}`);
      addText(`Email: ${profile.data.email || 'N/A'}`);
      addText(`Country: ${profile.data.country || 'N/A'}`);
      addText(`Member Since: ${new Date(profile.data.created_at || '').toLocaleDateString()}`);
    }
    yPos += 5;

    // Templates Section
    doc.setFontSize(16);
    addText('Templates Purchased', true);
    doc.setFontSize(10);
    if (templates.data && templates.data.length > 0) {
      templates.data.forEach((purchase: any) => {
        addText(`- ${purchase.site_templates?.name || 'Template'} (${new Date(purchase.created_at).toLocaleDateString()})`);
      });
    } else {
      addText('No templates purchased');
    }
    yPos += 5;

    // Memorials Section
    doc.setFontSize(16);
    addText('Memorials Created', true);
    doc.setFontSize(10);
    if (memorials.data && memorials.data.length > 0) {
      memorials.data.forEach((memorial: any) => {
        addText(`- ${memorial.name} (${memorial.date_of_birth || 'N/A'} - ${memorial.date_of_death || 'N/A'})`, true);
        if (memorial.bio) {
          const bioLines = doc.splitTextToSize(`  ${memorial.bio}`, 170);
          bioLines.forEach((line: string) => addText(line));
        }
      });
    } else {
      addText('No memorials created');
    }
    yPos += 5;

    // Timeline Posts Section
    doc.setFontSize(16);
    addText('Timeline Posts', true);
    doc.setFontSize(10);
    if (posts.data && posts.data.length > 0) {
      posts.data.forEach((post: any) => {
        addText(`- Posted on ${new Date(post.created_at).toLocaleDateString()}`, true);
        if (post.content) {
          const contentLines = doc.splitTextToSize(`  ${post.content}`, 170);
          contentLines.forEach((line: string) => addText(line));
        }
      });
    } else {
      addText('No timeline posts');
    }
    yPos += 5;

    // Tributes Section
    doc.setFontSize(16);
    addText('Tributes Shared', true);
    doc.setFontSize(10);
    if (tributes.data && tributes.data.length > 0) {
      tributes.data.forEach((tribute: any) => {
        addText(`- Shared on ${new Date(tribute.created_at).toLocaleDateString()}`, true);
        const tributeLines = doc.splitTextToSize(`  ${tribute.tribute_text}`, 170);
        tributeLines.forEach((line: string) => addText(line));
      });
    } else {
      addText('No tributes shared');
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    const footerText = 'ReflectLife - Honoring memories, connecting hearts';
    doc.text(footerText, 105, pageHeight - 10, { align: 'center' });

    // Download
    doc.save('reflectlife-user-data-export.pdf');
    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

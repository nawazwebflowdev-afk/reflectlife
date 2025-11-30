import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export const exportUserDataToPDF = async (userId: string) => {
  try {
    // Fetch all user data
    const [
      profile, 
      templates, 
      memorials, 
      posts, 
      tributes,
      timelines,
      diaryEntries,
      trees,
      creatorProfile,
      creatorTemplates
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('template_purchases').select('*, site_templates(name)').eq('buyer_id', userId),
      supabase.from('memorials').select('*').eq('user_id', userId),
      supabase.from('memorial_posts').select('*').eq('user_id', userId),
      supabase.from('memorial_tributes').select('*').eq('user_id', userId),
      supabase.from('memorial_timelines').select('*').eq('user_id', userId),
      supabase.from('diary_entries').select('*').eq('user_id', userId),
      supabase.from('trees').select('*').eq('user_id', userId),
      supabase.from('template_creators').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('site_templates').select('*').eq('creator_id', userId),
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
    yPos += 5;

    // Memorial Timelines Section
    doc.setFontSize(16);
    addText('Memorial Timelines', true);
    doc.setFontSize(10);
    if (timelines.data && timelines.data.length > 0) {
      timelines.data.forEach((timeline: any) => {
        addText(`- ${timeline.title} (${new Date(timeline.created_at).toLocaleDateString()})`, true);
        if (timeline.description) {
          const descLines = doc.splitTextToSize(`  ${timeline.description}`, 170);
          descLines.forEach((line: string) => addText(line));
        }
        addText(`  Public: ${timeline.is_public ? 'Yes' : 'No'}`);
      });
    } else {
      addText('No timelines created');
    }
    yPos += 5;

    // Diary Entries Section
    doc.setFontSize(16);
    addText('Diary Entries', true);
    doc.setFontSize(10);
    if (diaryEntries.data && diaryEntries.data.length > 0) {
      diaryEntries.data.forEach((entry: any) => {
        addText(`- ${entry.title} (${new Date(entry.entry_date || entry.created_at).toLocaleDateString()})`, true);
        if (entry.content) {
          const contentLines = doc.splitTextToSize(`  ${entry.content}`, 170);
          contentLines.forEach((line: string) => addText(line));
        }
        if (entry.tags && entry.tags.length > 0) {
          addText(`  Tags: ${entry.tags.join(', ')}`);
        }
      });
    } else {
      addText('No diary entries');
    }
    yPos += 5;

    // Trees Section
    doc.setFontSize(16);
    addText('Family & Friendship Trees', true);
    doc.setFontSize(10);
    if (trees.data && trees.data.length > 0) {
      trees.data.forEach((tree: any) => {
        addText(`- ${tree.name} (${tree.tree_type})`, true);
        addText(`  Created: ${new Date(tree.created_at).toLocaleDateString()}`);
        addText(`  Last Updated: ${new Date(tree.updated_at).toLocaleDateString()}`);
      });
    } else {
      addText('No trees created');
    }
    yPos += 5;

    // Creator Profile Section (if applicable)
    if (creatorProfile.data) {
      doc.setFontSize(16);
      addText('Creator Profile', true);
      doc.setFontSize(10);
      addText(`Display Name: ${creatorProfile.data.display_name}`);
      addText(`Country: ${creatorProfile.data.country}`);
      addText(`Status: ${creatorProfile.data.approved ? 'Approved' : 'Pending Approval'}`);
      if (creatorProfile.data.description) {
        const descLines = doc.splitTextToSize(`Description: ${creatorProfile.data.description}`, 170);
        descLines.forEach((line: string) => addText(line));
      }
      if (creatorProfile.data.portfolio) {
        addText(`Portfolio: ${creatorProfile.data.portfolio}`);
      }
      yPos += 5;

      // Creator Templates Section
      doc.setFontSize(16);
      addText('Templates Created', true);
      doc.setFontSize(10);
      if (creatorTemplates.data && creatorTemplates.data.length > 0) {
        creatorTemplates.data.forEach((template: any) => {
          addText(`- ${template.name} (€${template.price})`, true);
          if (template.description) {
            const descLines = doc.splitTextToSize(`  ${template.description}`, 170);
            descLines.forEach((line: string) => addText(line));
          }
          addText(`  Country: ${template.country}`);
          addText(`  Free: ${template.is_free ? 'Yes' : 'No'}`);
        });
      } else {
        addText('No templates created');
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    const footerText = 'ReflectLife - Honoring memories, connecting hearts';
    doc.text(footerText, 105, pageHeight - 10, { align: 'center' });

    // Download
    doc.save(`user_export_${userId}.pdf`);
    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

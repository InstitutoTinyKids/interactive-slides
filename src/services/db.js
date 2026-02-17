import { supabase } from '../lib/supabase';

export const dbService = {
    // Projects
    async getProjects() {
        const { data, error } = await supabase.from('projects').select('*').order('order_index', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async updateProject(id, updates) {
        const { data, error } = await supabase.from('projects').update(updates).eq('id', id);
        if (error) throw error;
        return data;
    },

    async createProject(project) {
        const { data, error } = await supabase.from('projects').insert(project);
        if (error) throw error;
        return data;
    },

    async deleteProject(id) {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
    },

    // Folders
    async getFolders() {
        const { data, error } = await supabase.from('folders').select('*').order('order_index', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async updateFolder(id, updates) {
        const { data, error } = await supabase.from('folders').update(updates).eq('id', id);
        if (error) throw error;
        return data;
    },

    async createFolder(folder) {
        const { data, error } = await supabase.from('folders').insert(folder);
        if (error) throw error;
        return data;
    },

    async deleteFolder(id) {
        const { error } = await supabase.from('folders').delete().eq('id', id);
        if (error) throw error;
    },

    // Slides
    async getSlides(projectId) {
        const { data, error } = await supabase.from('slides').select('*').eq('project_id', projectId).order('order_index', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async saveSlides(projectId, slides) {
        const { error: dError } = await supabase.from('slides').delete().eq('project_id', projectId);
        if (dError) throw dError;

        if (slides.length > 0) {
            const { error: sError } = await supabase.from('slides').insert(slides);
            if (sError) throw sError;
        }
    },

    // Interactions
    async getInteractions(slideIds) {
        const { data, error } = await supabase.from('interactions').select('*').in('slide_id', slideIds).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async deleteInteractions(slideIds) {
        const { error } = await supabase.from('interactions').delete().in('slide_id', slideIds);
        if (error) throw error;
    },

    async createInteraction(interaction) {
        const { data, error } = await supabase.from('interactions').insert(interaction);
        if (error) throw error;
        return data;
    },

    // Storage
    async uploadFile(bucket, fileName, file) {
        const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        return data;
    },

    async deleteFile(bucket, fileName) {
        const { error } = await supabase.storage.from(bucket).remove([fileName]);
        if (error) throw error;
    },

    getPublicUrl(bucket, fileName) {
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return publicUrl;
    }
};
